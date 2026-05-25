"""
Pydantic schemas for API request/response validation.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ── Shared value types ───────────────────────────────────────────────

class Vec3(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0


class CalibrationStatus(BaseModel):
    system: int = 0
    gyroscope: int = 0
    accelerometer: int = 0
    magnetometer: int = 0


# ── Upload (gateway → backend) ──────────────────────────────────────

class SampleIn(BaseModel):
    timestamp: float
    sequence_number: int
    euler: Vec3
    acceleration: Vec3
    gyroscope: Vec3
    linear_acceleration: Vec3
    calibration: CalibrationStatus
    step_count: int = 0


class BatchUpload(BaseModel):
    gateway_id: str
    device_id: Optional[str] = None
    session_id: str
    samples: List[SampleIn]
    batch_sequence: int
    sent_at: float = 0.0


class BatchAck(BaseModel):
    accepted: bool
    batch_sequence: int
    samples_accepted: int
    samples_duplicate: int = 0
    highest_sequence: int
    message: str = ""


# ── Heartbeat ────────────────────────────────────────────────────────

class HeartbeatIn(BaseModel):
    gateway_id: str
    timestamp: float
    uptime_seconds: float = 0.0
    pending_samples: int = 0
    last_sensor_contact: Optional[float] = None
    ble_connected: bool = False
    software_version: str = ""


# ── Dashboard responses ──────────────────────────────────────────────

class GatewaySummary(BaseModel):
    id: str
    label: Optional[str] = None
    patient_label: Optional[str] = None
    is_online: bool = False
    ble_connected: bool = False
    last_heartbeat: Optional[datetime] = None
    last_sync: Optional[datetime] = None
    pending_samples: int = 0


class SessionSummary(BaseModel):
    id: str
    gateway_id: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    sample_count: int = 0
    total_steps: int = 0


class RecentSample(BaseModel):
    timestamp: datetime
    euler: Vec3
    linear_acceleration: Vec3
    step_count: int = 0
    calibration: CalibrationStatus


class DashboardData(BaseModel):
    gateways: List[GatewaySummary]
    recent_sessions: List[SessionSummary]
    total_samples: int = 0
    total_patients: int = 0


# ── Device/patient management ────────────────────────────────────────

class PatientCreate(BaseModel):
    label: str = ""
    notes: Optional[str] = None


class PatientOut(BaseModel):
    id: str
    label: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class GatewayRegister(BaseModel):
    gateway_id: str
    label: Optional[str] = None
    patient_id: Optional[str] = None
    device_id: Optional[str] = None
    location: Optional[str] = None
    software_version: str = ""
