"""
Gateway configuration.

All secrets and deployment-specific values come from environment variables.
Defaults are safe for local development.
"""

import os
from dataclasses import dataclass, field
from uuid import uuid4


def _default_gateway_id() -> str:
    """Read or generate a persistent gateway ID."""
    id_file = os.path.expanduser("~/.rpm_gateway_id")
    if os.path.exists(id_file):
        with open(id_file) as f:
            return f.read().strip()
    gw_id = str(uuid4())
    try:
        with open(id_file, "w") as f:
            f.write(gw_id)
    except OSError:
        pass
    return gw_id


@dataclass
class GatewayConfig:
    # Identity
    gateway_id: str = field(default_factory=lambda: os.getenv(
        "RPM_GATEWAY_ID", _default_gateway_id()
    ))

    # Cloud backend
    backend_url: str = field(default_factory=lambda: os.getenv(
        "RPM_BACKEND_URL", "http://localhost:8080"
    ))
    api_key: str = field(default_factory=lambda: os.getenv(
        "RPM_API_KEY", "dev-api-key-change-me"
    ))

    # BLE sensor
    ble_device_name: str = field(default_factory=lambda: os.getenv(
        "RPM_BLE_DEVICE_NAME", "ESP32_BNO055"
    ))
    ble_device_address: str = field(default_factory=lambda: os.getenv(
        "RPM_BLE_DEVICE_ADDRESS", ""
    ))
    ble_scan_timeout: float = field(default_factory=lambda: float(os.getenv(
        "RPM_BLE_SCAN_TIMEOUT", "10.0"
    )))
    ble_reconnect_interval: float = field(default_factory=lambda: float(os.getenv(
        "RPM_BLE_RECONNECT_INTERVAL", "5.0"
    )))

    # Local persistence
    db_path: str = field(default_factory=lambda: os.getenv(
        "RPM_LOCAL_DB", os.path.expanduser("~/.rpm_gateway.db")
    ))

    # Sync worker
    sync_interval: float = field(default_factory=lambda: float(os.getenv(
        "RPM_SYNC_INTERVAL", "10.0"
    )))
    batch_size: int = field(default_factory=lambda: int(os.getenv(
        "RPM_BATCH_SIZE", "200"
    )))
    max_retry_backoff: float = field(default_factory=lambda: float(os.getenv(
        "RPM_MAX_RETRY_BACKOFF", "300.0"
    )))

    # Status server
    status_host: str = field(default_factory=lambda: os.getenv(
        "RPM_STATUS_HOST", "0.0.0.0"
    ))
    status_port: int = field(default_factory=lambda: int(os.getenv(
        "RPM_STATUS_PORT", "8090"
    )))

    # Sampling
    sampling_rate: int = field(default_factory=lambda: int(os.getenv(
        "RPM_SAMPLING_RATE", "20"
    )))

    # Logging
    log_level: str = field(default_factory=lambda: os.getenv(
        "RPM_LOG_LEVEL", "INFO"
    ))
