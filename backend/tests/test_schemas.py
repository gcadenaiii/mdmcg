"""
Tests for Pydantic schemas — pure validation, no database or HTTP.

Covers:
- Vec3 defaults
- CalibrationStatus defaults
- SampleIn required fields
- BatchUpload structure
- HeartbeatIn defaults
- PatientCreate / PatientOut
- GatewayRegister
"""

import pytest
from pydantic import ValidationError

from app.schemas import (
    Vec3,
    CalibrationStatus,
    SampleIn,
    BatchUpload,
    HeartbeatIn,
    PatientCreate,
    PatientOut,
    GatewayRegister,
    BatchAck,
)


# ── Vec3 ──────────────────────────────────────────────────────────────

def test_vec3_defaults_to_zero():
    v = Vec3()
    assert v.x == 0.0
    assert v.y == 0.0
    assert v.z == 0.0


def test_vec3_accepts_values():
    v = Vec3(x=1.5, y=-2.0, z=0.0)
    assert v.x == 1.5
    assert v.y == -2.0


# ── CalibrationStatus ─────────────────────────────────────────────────

def test_calibration_defaults_to_zero():
    c = CalibrationStatus()
    assert c.system == 0
    assert c.gyroscope == 0
    assert c.accelerometer == 0
    assert c.magnetometer == 0


def test_calibration_fully_calibrated():
    c = CalibrationStatus(system=3, gyroscope=3, accelerometer=3, magnetometer=3)
    assert c.system == 3


# ── SampleIn ──────────────────────────────────────────────────────────

def test_sample_in_requires_timestamp():
    with pytest.raises(ValidationError):
        SampleIn(sequence_number=1)  # missing timestamp


def test_sample_in_requires_sequence_number():
    with pytest.raises(ValidationError):
        SampleIn(timestamp=1700000000.0)  # missing sequence_number


def _minimal_sample(**overrides):
    """Return the minimal valid SampleIn dict (Vec3 fields default to 0,0,0)."""
    base = dict(
        timestamp=1700000000.0,
        sequence_number=1,
        euler={},
        acceleration={},
        gyroscope={},
        linear_acceleration={},
        calibration={},
    )
    base.update(overrides)
    return SampleIn(**base)


def test_sample_in_step_count_defaults_to_zero():
    s = _minimal_sample()
    assert s.step_count == 0


def test_sample_in_full():
    s = SampleIn(
        timestamp=1700000000.0,
        sequence_number=42,
        euler=Vec3(x=90.0, y=0.0, z=0.0),
        acceleration=Vec3(x=0.1, y=0.2, z=9.8),
        gyroscope=Vec3(),
        linear_acceleration=Vec3(),
        calibration=CalibrationStatus(system=3, gyroscope=3, accelerometer=3, magnetometer=3),
        step_count=15,
    )
    assert s.sequence_number == 42
    assert s.euler.x == 90.0
    assert s.step_count == 15


# ── BatchUpload ───────────────────────────────────────────────────────

def test_batch_upload_requires_gateway_id():
    with pytest.raises(ValidationError):
        BatchUpload(session_id="s1", samples=[], batch_sequence=1)


def test_batch_upload_requires_session_id():
    with pytest.raises(ValidationError):
        BatchUpload(gateway_id="gw1", samples=[], batch_sequence=1)


def test_batch_upload_empty_samples_is_valid():
    b = BatchUpload(gateway_id="gw1", session_id="s1", samples=[], batch_sequence=1)
    assert b.samples == []


def test_batch_upload_with_samples():
    sample = _minimal_sample()
    b = BatchUpload(gateway_id="gw1", session_id="s1", samples=[sample], batch_sequence=1)
    assert len(b.samples) == 1


# ── HeartbeatIn ───────────────────────────────────────────────────────

def test_heartbeat_requires_gateway_id():
    with pytest.raises(ValidationError):
        HeartbeatIn(timestamp=1700000000.0)


def test_heartbeat_defaults():
    hb = HeartbeatIn(gateway_id="gw1", timestamp=1700000000.0)
    assert hb.ble_connected is False
    assert hb.pending_samples == 0
    assert hb.software_version == ""


# ── PatientCreate / PatientOut ────────────────────────────────────────

def test_patient_create_accepts_label():
    p = PatientCreate(label="John Smith")
    assert p.label == "John Smith"


def test_patient_create_notes_optional():
    p = PatientCreate(label="Jane", notes=None)
    assert p.notes is None


def test_patient_out_from_orm():
    from datetime import datetime, timezone
    data = {
        "id": "abc-123",
        "label": "Alice",
        "notes": None,
        "created_at": datetime(2025, 1, 1, tzinfo=timezone.utc),
    }
    p = PatientOut.model_validate(data)
    assert p.id == "abc-123"
    assert p.label == "Alice"


# ── GatewayRegister ───────────────────────────────────────────────────

def test_gateway_register_requires_gateway_id():
    with pytest.raises(ValidationError):
        GatewayRegister()


def test_gateway_register_optional_fields():
    reg = GatewayRegister(gateway_id="gw-1")
    assert reg.label is None
    assert reg.patient_id is None
    assert reg.software_version == ""


# ── BatchAck ─────────────────────────────────────────────────────────

def test_batch_ack_structure():
    ack = BatchAck(
        accepted=True,
        batch_sequence=5,
        samples_accepted=10,
        highest_sequence=99,
    )
    assert ack.samples_duplicate == 0
    assert ack.message == ""
