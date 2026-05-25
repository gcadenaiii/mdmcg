"""
BLE ingestion service for the RPM gateway.

Connects to the ESP32 BLE bridge, receives BNO055 sensor data via
notifications, and writes each sample into the local SQLite store.

The ESP32 advertises a BLE GATT service with a notify characteristic
that streams the same CSV format used by the existing Phase 0 firmware:
    DATA,euler_x,euler_y,euler_z,accel_x,...,cal_sys,cal_gyro,cal_accel,cal_mag

This module handles:
- BLE scanning and connection
- Automatic reconnection on disconnect
- CSV parsing (reuses format from existing sensors)
- Writing parsed samples to LocalStore with monotonic sequence numbers
- Step detection (reuses the FSM from MotionTracker)

It is designed to run as a long-lived asyncio task.
"""

import asyncio
import logging
import time
from typing import Optional
from uuid import uuid4

from bleak import BleakClient, BleakScanner
from bleak.backends.device import BLEDevice

from .local_store import LocalStore
from .config import GatewayConfig

logger = logging.getLogger(__name__)

# BLE UUIDs — must match ESP32 firmware (esp32_ble_bridge.ino)
SERVICE_UUID = "19B10000-E8F2-537E-4F6C-D104768A1214"
DATA_CHAR_UUID = "19B10001-E8F2-537E-4F6C-D104768A1214"


class BLEIngest:
    """Async BLE client that ingests sensor data into the local store."""

    def __init__(self, config: GatewayConfig, store: LocalStore):
        self.config = config
        self.store = store
        self._client: Optional[BleakClient] = None
        self._connected = False
        self._session_id = str(uuid4())
        self._last_data_time: Optional[float] = None
        self._running = False

        # Step detection state (mirrors MotionTracker FSM)
        self._step_count = 0
        self._step_state = "WAITING"
        self._peak_accel = 0.0
        self._frames_since_lift = 0
        self._step_cooldown = 0
        self._last_step_time = 0.0

    @property
    def connected(self) -> bool:
        return self._connected

    @property
    def last_data_time(self) -> Optional[float]:
        return self._last_data_time

    @property
    def step_count(self) -> int:
        return self._step_count

    # ── BLE scanning ─────────────────────────────────────────────────

    async def _scan(self) -> Optional[BLEDevice]:
        """Scan for the ESP32 BLE device by name or address."""
        name = self.config.ble_device_name
        addr = self.config.ble_device_address
        timeout = self.config.ble_scan_timeout

        logger.info("Scanning for BLE device (name=%s addr=%s timeout=%.0fs)", name, addr, timeout)

        devices = await BleakScanner.discover(timeout=timeout)
        for dev in devices:
            if addr and dev.address.lower() == addr.lower():
                logger.info("Found device by address: %s (%s)", dev.address, dev.name)
                return dev
            if name and dev.name and name in dev.name:
                logger.info("Found device by name: %s (%s)", dev.name, dev.address)
                return dev

        logger.warning("BLE device not found after %.0fs scan", timeout)
        return None

    # ── Data handling ────────────────────────────────────────────────

    def _parse_csv(self, line: str) -> Optional[dict]:
        """Parse the CSV DATA line from the ESP32/Teensy firmware."""
        if not line.startswith("DATA,"):
            return None
        parts = line.split(",")
        if len(parts) < 17:
            return None
        try:
            return {
                "euler": {"x": float(parts[1]), "y": float(parts[2]), "z": float(parts[3])},
                "acceleration": {"x": float(parts[4]), "y": float(parts[5]), "z": float(parts[6])},
                "gyroscope": {"x": float(parts[7]), "y": float(parts[8]), "z": float(parts[9])},
                "linear_acceleration": {"x": float(parts[10]), "y": float(parts[11]), "z": float(parts[12])},
                "calibration": {
                    "system": int(parts[13]),
                    "gyroscope": int(parts[14]),
                    "accelerometer": int(parts[15]),
                    "magnetometer": int(parts[16]),
                },
            }
        except (ValueError, IndexError) as e:
            logger.debug("CSV parse error: %s", e)
            return None

    def _update_step_detection(self, data: dict) -> None:
        """Run the step detection FSM on a parsed sample."""
        la = data.get("linear_acceleration", {})
        accel_mag = (la.get("x", 0) ** 2 + la.get("y", 0) ** 2 + la.get("z", 0) ** 2) ** 0.5
        now = time.time()

        if self._step_cooldown > 0:
            self._step_cooldown -= 1
            if self._step_cooldown == 0:
                self._step_state = "WAITING"
            return

        if self._step_state == "WAITING":
            if accel_mag > 1.5:
                self._step_state = "LIFT_DETECTED"
                self._peak_accel = accel_mag
                self._frames_since_lift = 0
        elif self._step_state == "LIFT_DETECTED":
            self._frames_since_lift += 1
            if accel_mag < 1.0:
                self._step_state = "WAITING_IMPACT"
        elif self._step_state == "WAITING_IMPACT":
            self._frames_since_lift += 1
            if accel_mag > 1.5:
                if (now - self._last_step_time) > 0.3:
                    self._step_count += 1
                    self._last_step_time = now
                self._step_state = "COOLDOWN"
                self._step_cooldown = 15

    def _on_notification(self, _sender, data: bytearray) -> None:
        """Handle incoming BLE notification (called from bleak's event loop)."""
        try:
            line = data.decode("utf-8").strip()
        except UnicodeDecodeError:
            return

        parsed = self._parse_csv(line)
        if parsed is None:
            return

        self._update_step_detection(parsed)

        now = time.time()
        self._last_data_time = now

        seq = self.store.next_sequence()
        self.store.insert_sample(
            sequence_number=seq,
            timestamp=now,
            session_id=self._session_id,
            data=parsed,
            step_count=self._step_count,
        )

    # ── Connection loop ──────────────────────────────────────────────

    async def run(self) -> None:
        """Main loop: scan, connect, receive, auto-reconnect on failure."""
        self._running = True
        logger.info("BLE ingest started (gateway_id=%s)", self.config.gateway_id)

        while self._running:
            try:
                device = await self._scan()
                if device is None:
                    logger.info(
                        "Will retry scan in %.0fs", self.config.ble_reconnect_interval
                    )
                    await asyncio.sleep(self.config.ble_reconnect_interval)
                    continue

                self._client = BleakClient(
                    device,
                    disconnected_callback=self._on_disconnect,
                )
                await self._client.connect()

                if not self._client.is_connected:
                    logger.warning("BLE connect returned but client not connected")
                    await asyncio.sleep(self.config.ble_reconnect_interval)
                    continue

                self._connected = True
                self._session_id = str(uuid4())  # new session per connection
                logger.info("BLE connected to %s — session %s", device.name, self._session_id)

                await self._client.start_notify(DATA_CHAR_UUID, self._on_notification)

                # Stay connected until disconnect or stop
                while self._connected and self._running:
                    await asyncio.sleep(1.0)

            except Exception as e:
                logger.error("BLE ingest error: %s", e, exc_info=True)
                self._connected = False
                await asyncio.sleep(self.config.ble_reconnect_interval)

    def _on_disconnect(self, _client) -> None:
        logger.warning("BLE device disconnected")
        self._connected = False

    async def stop(self) -> None:
        self._running = False
        if self._client and self._client.is_connected:
            try:
                await self._client.stop_notify(DATA_CHAR_UUID)
                await self._client.disconnect()
            except Exception as e:
                logger.debug("Error during BLE disconnect: %s", e)
        self._connected = False
