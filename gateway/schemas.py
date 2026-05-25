"""
Shared data schemas for the RPM PoC.

These Pydantic models define the contract between the Raspberry Pi gateway
and the cloud backend. Both sides import from here (or duplicate the
definitions — the JSON schema is the real contract).

Key design decisions:
- sequence_number: monotonic per-gateway, used for idempotent dedup on the backend
- gateway_id: UUID assigned to each Pi; the backend uses this + sequence_number
  to detect duplicates
- session_id: groups samples that belong to one continuous recording window
- timestamps are UTC floats (Unix epoch) at the gateway, stored as
  timezone-aware datetimes in PostgreSQL
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────────────────

class SyncStatus(str, Enum):
    PENDING = "pending"
    UPLOADING = "uploading"
    SYNCED = "synced"
    FAILED = "failed"


# ── Sensor sample ────────────────────────────────────────────────────

class Vec3(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0


class CalibrationStatus(BaseModel):
    system: int = 0
    gyroscope: int = 0
    accelerometer: int = 0
    magnetometer: int = 0


class SensorSample(BaseModel):
    """One reading from the BNO055 at ~20 Hz."""
    timestamp: float = Field(..., description="UTC Unix epoch seconds")
    sequence_number: int = Field(..., description="Monotonic per-gateway counter")
    euler: Vec3
    acceleration: Vec3
    gyroscope: Vec3
    linear_acceleration: Vec3
    calibration: CalibrationStatus
    step_count: int = 0


# ── Upload batch (gateway -> backend) ────────────────────────────────

class SensorBatch(BaseModel):
    """A batch of samples uploaded from the gateway to the cloud."""
    gateway_id: str = Field(..., description="UUID of the Pi gateway")
    device_id: Optional[str] = Field(None, description="UUID of the sensor device")
    session_id: str = Field(default_factory=lambda: str(uuid4()))
    samples: List[SensorSample]
    batch_sequence: int = Field(..., description="Batch counter for ordering")
    sent_at: float = Field(
        default_factory=lambda: datetime.now(timezone.utc).timestamp()
    )


class BatchAck(BaseModel):
    """Backend acknowledgment of a received batch."""
    accepted: bool
    batch_sequence: int
    samples_accepted: int
    highest_sequence: int = Field(
        ..., description="Highest sequence_number stored; gateway can prune up to this"
    )
    message: str = ""


# ── Gateway heartbeat ────────────────────────────────────────────────

class GatewayHeartbeat(BaseModel):
    """Periodic status from gateway to backend."""
    gateway_id: str
    timestamp: float = Field(
        default_factory=lambda: datetime.now(timezone.utc).timestamp()
    )
    uptime_seconds: float = 0.0
    pending_samples: int = 0
    last_sensor_contact: Optional[float] = None
    ble_connected: bool = False
    software_version: str = "0.1.0"


class GatewayRegistration(BaseModel):
    """Initial registration of a gateway with the backend."""
    gateway_id: str
    label: Optional[str] = None
    patient_id: Optional[str] = None
    location: Optional[str] = None
    software_version: str = "0.1.0"


# ── Device / patient registry ────────────────────────────────────────

class DeviceInfo(BaseModel):
    device_id: str = Field(default_factory=lambda: str(uuid4()))
    device_type: str = "esp32_ble_bno055"
    label: Optional[str] = None
    firmware_version: Optional[str] = None


class PatientInfo(BaseModel):
    patient_id: str = Field(default_factory=lambda: str(uuid4()))
    label: str = ""  # no PII in PoC — use opaque labels
    notes: Optional[str] = None
