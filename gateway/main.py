"""
RPM Gateway — main entry point.

Orchestrates:
- BLE ingestion (async task)
- Sync worker (async task)
- Local status HTTP server (background thread)

Usage:
    python -m gateway                  # default config from env vars
    python -m gateway --mock           # use mock data generator instead of BLE
"""

import argparse
import asyncio
import logging
import os
import signal
import sys
import threading
import time

from .config import GatewayConfig
from .local_store import LocalStore
from .ble_ingest import BLEIngest
from .sync_worker import SyncWorker
from .status_server import run_status_server

logger = logging.getLogger("gateway")

START_TIME = time.time()


def setup_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


async def mock_ingest(store: LocalStore, config: GatewayConfig) -> None:
    """Generate fake sensor data for development without BLE hardware."""
    import math
    import random
    from uuid import uuid4

    session_id = str(uuid4())
    logger.info("Mock ingest running (session %s)", session_id)
    step_count = 0
    t = 0.0

    while True:
        seq = store.next_sequence()
        now = time.time()
        t += 1.0 / config.sampling_rate

        # Simulate gentle walking motion
        data = {
            "euler": {
                "x": 180 + 5 * math.sin(t * 0.5),
                "y": 2 * math.sin(t * 1.8),
                "z": 1.5 * math.cos(t * 1.8),
            },
            "acceleration": {
                "x": 0.3 * math.sin(t * 3.6) + random.gauss(0, 0.05),
                "y": 0.2 * math.cos(t * 3.6) + random.gauss(0, 0.05),
                "z": 9.81 + 0.5 * math.sin(t * 1.8) + random.gauss(0, 0.05),
            },
            "gyroscope": {
                "x": random.gauss(0, 0.02),
                "y": random.gauss(0, 0.02),
                "z": random.gauss(0, 0.02),
            },
            "linear_acceleration": {
                "x": 0.3 * math.sin(t * 3.6),
                "y": 0.2 * math.cos(t * 3.6),
                "z": 0.5 * math.sin(t * 1.8),
            },
            "calibration": {
                "system": 3, "gyroscope": 3, "accelerometer": 3, "magnetometer": 3,
            },
        }

        # Simulate a step every ~1 second
        if int(t) > step_count:
            step_count = int(t)

        store.insert_sample(seq, now, session_id, data, step_count)

        await asyncio.sleep(1.0 / config.sampling_rate)


async def run_gateway(config: GatewayConfig, use_mock: bool = False) -> None:
    store = LocalStore(config.db_path)
    store.open()

    ble: BLEIngest | None = None

    # Start BLE ingest or mock
    if use_mock:
        ingest_task = asyncio.create_task(mock_ingest(store, config))
    else:
        ble = BLEIngest(config, store)
        ingest_task = asyncio.create_task(ble.run())

    # Start sync worker
    def get_ble_status():
        if ble:
            return ble.connected, ble.last_data_time
        return True, time.time()  # mock always "connected"

    sync = SyncWorker(config, store)
    sync_task = asyncio.create_task(
        sync.run(get_ble_status=get_ble_status, start_time=START_TIME)
    )

    # Status server in a background thread
    def get_status():
        try:
            samples_total = store.total_count()
            samples_pending = store.pending_count()
            samples_synced = store.synced_count()
        except Exception as e:
            logger.warning("Status metrics unavailable: %s", e)
            samples_total = -1
            samples_pending = -1
            samples_synced = -1

        return {
            "gateway_id": config.gateway_id,
            "uptime_seconds": round(time.time() - START_TIME, 1),
            "ble_connected": ble.connected if ble else True,
            "last_sensor_data": ble.last_data_time if ble else time.time(),
            "step_count": ble.step_count if ble else 0,
            "samples_total": samples_total,
            "samples_pending": samples_pending,
            "samples_synced": samples_synced,
            "last_sync_success": sync.last_sync_success,
            "consecutive_sync_failures": sync.consecutive_failures,
            "backend_url": config.backend_url,
            "mock_mode": use_mock,
        }

    status_thread = threading.Thread(
        target=run_status_server,
        args=(config.status_host, config.status_port, get_status),
        daemon=True,
    )
    status_thread.start()

    logger.info("Gateway running — press Ctrl+C to stop")
    logger.info("  BLE mode: %s", "mock" if use_mock else "live")
    logger.info("  Backend:  %s", config.backend_url)
    logger.info("  Status:   http://%s:%d", config.status_host, config.status_port)

    # Wait for shutdown signal
    stop_event = asyncio.Event()

    def _signal_handler():
        logger.info("Shutdown signal received")
        stop_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _signal_handler)

    await stop_event.wait()

    # Clean shutdown
    logger.info("Shutting down...")
    if ble:
        await ble.stop()
    await sync.stop()
    ingest_task.cancel()
    sync_task.cancel()
    store.close()
    logger.info("Gateway stopped")


def main():
    parser = argparse.ArgumentParser(description="RPM Gateway Service")
    parser.add_argument("--mock", action="store_true", help="Use mock sensor data")
    args = parser.parse_args()

    config = GatewayConfig()
    setup_logging(config.log_level)

    logger.info("Gateway ID: %s", config.gateway_id)

    asyncio.run(run_gateway(config, use_mock=args.mock))


if __name__ == "__main__":
    main()
