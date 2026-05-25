"""
SQLAlchemy ORM models for the RPM backend.

Schema design:
- patients: opaque identifiers (no PII in PoC)
- devices: sensor hardware (ESP32 + BNO055 units)
- gateways: Raspberry Pi gateways, each assigned to a patient
- sensor_samples: individual 20 Hz readings, deduplicated by (gateway_id, sequence_number)
- sensor_sessions: groups of continuous samples from one BLE connection
- sync_events: audit log of every batch upload

Future FHIR mapping notes:
- patient → FHIR Patient resource
- device → FHIR Device resource
- sensor_session → FHIR Encounter
- sensor_samples → FHIR Observation (component-based for multi-axis)
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text,
    ForeignKey, UniqueConstraint, Index,
)
from sqlalchemy.orm import relationship

from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


def new_uuid():
    return str(uuid.uuid4())


# ── Patients ─────────────────────────────────────────────────────────

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(36), primary_key=True, default=new_uuid)
    label = Column(String(255), nullable=False, default="")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    gateways = relationship("Gateway", back_populates="patient")


# ── Devices ──────────────────────────────────────────────────────────

class Device(Base):
    __tablename__ = "devices"

    id = Column(String(36), primary_key=True, default=new_uuid)
    device_type = Column(String(100), nullable=False, default="esp32_ble_bno055")
    label = Column(String(255), nullable=True)
    firmware_version = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    gateways = relationship("Gateway", back_populates="device")


# ── Gateways ─────────────────────────────────────────────────────────

class Gateway(Base):
    __tablename__ = "gateways"

    id = Column(String(36), primary_key=True)
    label = Column(String(255), nullable=True)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=True)
    device_id = Column(String(36), ForeignKey("devices.id"), nullable=True)
    location = Column(String(255), nullable=True)
    software_version = Column(String(50), nullable=True)
    last_heartbeat = Column(DateTime(timezone=True), nullable=True)
    last_sync = Column(DateTime(timezone=True), nullable=True)
    is_online = Column(Boolean, default=False)
    ble_connected = Column(Boolean, default=False)
    pending_samples = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    patient = relationship("Patient", back_populates="gateways")
    device = relationship("Device", back_populates="gateways")
    sessions = relationship("SensorSession", back_populates="gateway")
    sync_events = relationship("SyncEvent", back_populates="gateway")


# ── Sensor Sessions ──────────────────────────────────────────────────

class SensorSession(Base):
    __tablename__ = "sensor_sessions"

    id = Column(String(36), primary_key=True, default=new_uuid)
    gateway_id = Column(String(36), ForeignKey("gateways.id"), nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    sample_count = Column(Integer, default=0)
    total_steps = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    gateway = relationship("Gateway", back_populates="sessions")
    samples = relationship("SensorSample", back_populates="session")


# ── Sensor Samples ───────────────────────────────────────────────────

class SensorSample(Base):
    __tablename__ = "sensor_samples"

    id = Column(Integer, primary_key=True, autoincrement=True)
    gateway_id = Column(String(36), nullable=False, index=True)
    session_id = Column(String(36), ForeignKey("sensor_sessions.id"), nullable=True)
    sequence_number = Column(Integer, nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)

    # BNO055 data stored as JSON for flexibility in PoC
    euler_x = Column(Float)
    euler_y = Column(Float)
    euler_z = Column(Float)
    accel_x = Column(Float)
    accel_y = Column(Float)
    accel_z = Column(Float)
    gyro_x = Column(Float)
    gyro_y = Column(Float)
    gyro_z = Column(Float)
    linear_accel_x = Column(Float)
    linear_accel_y = Column(Float)
    linear_accel_z = Column(Float)

    # Calibration
    cal_system = Column(Integer)
    cal_gyro = Column(Integer)
    cal_accel = Column(Integer)
    cal_mag = Column(Integer)

    step_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    session = relationship("SensorSession", back_populates="samples")

    __table_args__ = (
        UniqueConstraint("gateway_id", "sequence_number", name="uq_gateway_seq"),
        Index("idx_samples_gateway_ts", "gateway_id", "timestamp"),
    )


# ── Sync Events (audit log) ─────────────────────────────────────────

class SyncEvent(Base):
    __tablename__ = "sync_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    gateway_id = Column(String(36), ForeignKey("gateways.id"), nullable=False, index=True)
    batch_sequence = Column(Integer, nullable=False)
    samples_received = Column(Integer, default=0)
    samples_accepted = Column(Integer, default=0)
    samples_duplicate = Column(Integer, default=0)
    highest_sequence = Column(Integer, default=0)
    received_at = Column(DateTime(timezone=True), default=utcnow)

    gateway = relationship("Gateway", back_populates="sync_events")
