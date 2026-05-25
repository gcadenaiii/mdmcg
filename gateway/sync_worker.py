"""
Sync worker: uploads pending samples from LocalStore to the cloud backend.

Runs as a periodic asyncio task. On each tick:
1. Reads a batch of PENDING samples from SQLite
2. POSTs them to the backend /api/upload endpoint
3. On success, marks them SYNCED up to the acknowledged sequence number
4. On failure, marks them back to PENDING and backs off exponentially

Idempotency: the backend uses (gateway_id, sequence_number) as a natural
dedup key, so retransmitting the same batch is safe.
"""

import asyncio
import logging
import time
from typing import Optional

import aiohttp

from .config import GatewayConfig
from .local_store import LocalStore
from .schemas import SensorSample, SensorBatch, Vec3, CalibrationStatus

logger = logging.getLogger(__name__)


class SyncWorker:
    """Periodically uploads unsynced samples to the cloud backend."""

    def __init__(self, config: GatewayConfig, store: LocalStore):
        self.config = config
        self.store = store
        self._running = False
        self._batch_counter = 0
        self._consecutive_failures = 0
        self._last_sync_success: Optional[float] = None
        self._session: Optional[aiohttp.ClientSession] = None

    @property
    def last_sync_success(self) -> Optional[float]:
        return self._last_sync_success

    @property
    def consecutive_failures(self) -> int:
        return self._consecutive_failures

    # ── HTTP helpers ─────────────────────────────────────────────────

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        }

    def _upload_url(self) -> str:
        return f"{self.config.backend_url}/api/upload"

    def _heartbeat_url(self) -> str:
        return f"{self.config.backend_url}/api/heartbeat"

    # ── Batch building ───────────────────────────────────────────────

    def _rows_to_batch(self, rows: list) -> SensorBatch:
        """Convert LocalStore rows into a SensorBatch payload."""
        samples = []
        for row in rows:
            d = row["data"]
            samples.append(SensorSample(
                timestamp=row["timestamp"],
                sequence_number=row["sequence_number"],
                euler=Vec3(**d.get("euler", {})),
                acceleration=Vec3(**d.get("acceleration", {})),
                gyroscope=Vec3(**d.get("gyroscope", {})),
                linear_acceleration=Vec3(**d.get("linear_acceleration", {})),
                calibration=CalibrationStatus(**d.get("calibration", {})),
                step_count=row.get("step_count", 0),
            ))

        self._batch_counter += 1
        return SensorBatch(
            gateway_id=self.config.gateway_id,
            session_id=rows[0]["session_id"] if rows else "",
            samples=samples,
            batch_sequence=self._batch_counter,
        )

    # ── Upload cycle ─────────────────────────────────────────────────

    async def _upload_batch(self) -> bool:
        """Try to upload one batch. Returns True on success."""
        rows = self.store.get_pending_batch(limit=self.config.batch_size)
        if not rows:
            return True  # nothing to upload is not a failure

        batch = self._rows_to_batch(rows)
        seq_numbers = [r["sequence_number"] for r in rows]

        try:
            async with self._session.post(
                self._upload_url(),
                json=batch.model_dump(),
                headers=self._headers(),
                timeout=aiohttp.ClientTimeout(total=30),
            ) as resp:
                if resp.status == 200:
                    ack = await resp.json()
                    highest = ack.get("highest_sequence", max(seq_numbers))
                    synced = self.store.mark_synced(highest)
                    self.store.log_sync_attempt(
                        self._batch_counter, len(rows), accepted=True
                    )
                    self._consecutive_failures = 0
                    self._last_sync_success = time.time()
                    logger.info(
                        "Synced batch #%d: %d samples (up to seq %d)",
                        self._batch_counter, synced, highest,
                    )
                    return True
                else:
                    body = await resp.text()
                    logger.warning(
                        "Upload failed HTTP %d: %s", resp.status, body[:200]
                    )
                    self.store.mark_batch_failed(seq_numbers)
                    self.store.log_sync_attempt(
                        self._batch_counter, len(rows), accepted=False,
                        error=f"HTTP {resp.status}: {body[:200]}"
                    )
                    return False

        except Exception as e:
            logger.error("Upload error: %s", e)
            self.store.mark_batch_failed(seq_numbers)
            self.store.log_sync_attempt(
                self._batch_counter, len(rows), accepted=False, error=str(e)
            )
            return False

    def _backoff_seconds(self) -> float:
        """Exponential backoff with jitter, capped."""
        import random
        base = min(2 ** self._consecutive_failures, self.config.max_retry_backoff)
        jitter = random.uniform(0, base * 0.3)
        return base + jitter

    # ── Heartbeat ────────────────────────────────────────────────────

    async def _send_heartbeat(self, ble_connected: bool, pending: int,
                               last_sensor: Optional[float], uptime: float) -> None:
        """Send a lightweight heartbeat to the backend."""
        try:
            payload = {
                "gateway_id": self.config.gateway_id,
                "timestamp": time.time(),
                "uptime_seconds": uptime,
                "pending_samples": pending,
                "last_sensor_contact": last_sensor,
                "ble_connected": ble_connected,
            }
            async with self._session.post(
                self._heartbeat_url(),
                json=payload,
                headers=self._headers(),
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status != 200:
                    logger.debug("Heartbeat returned %d", resp.status)
        except Exception as e:
            logger.debug("Heartbeat failed: %s", e)

    # ── Main loop ────────────────────────────────────────────────────

    async def run(self, get_ble_status=None, start_time: float = 0.0) -> None:
        """Run the sync loop indefinitely.

        Args:
            get_ble_status: optional callable returning (connected: bool, last_data_time: float|None)
            start_time: process start time for uptime calculation
        """
        self._running = True
        self._session = aiohttp.ClientSession()
        heartbeat_interval = 60.0
        last_heartbeat = 0.0

        logger.info("Sync worker started (interval=%.0fs, batch=%d)",
                     self.config.sync_interval, self.config.batch_size)

        try:
            while self._running:
                # Upload pending data (keep looping if there's more)
                while self._running:
                    success = await self._upload_batch()
                    if not success:
                        self._consecutive_failures += 1
                        break
                    # If we got a full batch, there might be more
                    pending = self.store.pending_count()
                    if pending == 0:
                        break

                # Periodic heartbeat
                now = time.time()
                if now - last_heartbeat > heartbeat_interval:
                    ble_conn, last_sensor = False, None
                    if get_ble_status:
                        ble_conn, last_sensor = get_ble_status()
                    await self._send_heartbeat(
                        ble_conn, self.store.pending_count(),
                        last_sensor, now - start_time,
                    )
                    last_heartbeat = now

                # Periodic prune of old synced data
                self.store.prune_synced()

                # Wait
                if self._consecutive_failures > 0:
                    wait = self._backoff_seconds()
                    logger.info("Backing off %.1fs (failure #%d)", wait, self._consecutive_failures)
                    await asyncio.sleep(wait)
                else:
                    await asyncio.sleep(self.config.sync_interval)

        finally:
            await self._session.close()

    async def stop(self) -> None:
        self._running = False
