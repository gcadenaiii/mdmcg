"""
Tests for the sensor batch upload endpoint.

POST /api/upload

The production code uses a PostgreSQL-specific INSERT … ON CONFLICT DO NOTHING.
For unit tests we patch `pg_insert` with a SQLite-compatible equivalent so every
other piece of business logic (session creation, audit-log, broadcast, ack shape)
can be verified without a live PostgreSQL database.

Tests that specifically require PostgreSQL semantics are marked
`@pytest.mark.integration` and skipped by default.
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from app.models import Gateway, SensorSession, SyncEvent


# ── SQLite-compatible INSERT OR IGNORE shim ───────────────────────────

def _sqlite_insert(model):
    """
    Drop-in replacement for `pg_insert` that produces a SQLite-compatible
    INSERT OR IGNORE statement when `.on_conflict_do_nothing()` is called.
    """
    from sqlalchemy.dialects.sqlite import insert as _sqlite_ins

    class _Compat:
        def __init__(self, m):
            self._stmt = _sqlite_ins(m)

        def values(self, rows):
            self._stmt = self._stmt.values(rows)
            return self

        def on_conflict_do_nothing(self, constraint=None):
            return self._stmt.on_conflict_do_nothing()

    return _Compat(model)


def _pg_insert_patch():
    return patch("app.routers.upload.pg_insert", side_effect=_sqlite_insert)


# ── Helpers ───────────────────────────────────────────────────────────

def _sample(seq: int, steps: int = 0) -> dict:
    return {
        "timestamp": 1700000000.0 + seq,
        "sequence_number": seq,
        "euler": {"x": 0.0, "y": 0.0, "z": 0.0},
        "acceleration": {"x": 0.0, "y": 0.0, "z": 9.8},
        "gyroscope": {"x": 0.0, "y": 0.0, "z": 0.0},
        "linear_acceleration": {"x": 0.0, "y": 0.0, "z": 0.0},
        "calibration": {"system": 3, "gyroscope": 3, "accelerometer": 3, "magnetometer": 3},
        "step_count": steps,
    }


def _batch(gateway_id="gw-up-001", session_id="sess-001", seq_start=1, count=3, steps=10):
    return {
        "gateway_id": gateway_id,
        "session_id": session_id,
        "samples": [_sample(seq_start + i, steps) for i in range(count)],
        "batch_sequence": 1,
        "sent_at": 1700000000.0,
    }


# ── Tests ─────────────────────────────────────────────────────────────

async def test_upload_requires_auth(client):
    response = await client.post("/api/upload", json=_batch())
    assert response.status_code == 401


async def test_upload_returns_batch_ack(client, auth_headers):
    with _pg_insert_patch():
        response = await client.post(
            "/api/upload", json=_batch(), headers=auth_headers
        )
    assert response.status_code == 200
    body = response.json()
    assert body["accepted"] is True
    assert body["batch_sequence"] == 1
    assert "highest_sequence" in body


async def test_upload_auto_creates_gateway(client, auth_headers, db_session):
    with _pg_insert_patch():
        await client.post(
            "/api/upload",
            json=_batch(gateway_id="brand-new-gw"),
            headers=auth_headers,
        )
    gw = await db_session.get(Gateway, "brand-new-gw")
    assert gw is not None


async def test_upload_auto_creates_session(client, auth_headers, db_session):
    with _pg_insert_patch():
        await client.post(
            "/api/upload",
            json=_batch(session_id="new-session-id"),
            headers=auth_headers,
        )
    sess = await db_session.get(SensorSession, "new-session-id")
    assert sess is not None
    assert sess.started_at is not None
    assert sess.ended_at is not None


async def test_upload_updates_session_step_count(client, auth_headers, db_session):
    with _pg_insert_patch():
        await client.post(
            "/api/upload",
            json=_batch(session_id="step-sess", steps=25),
            headers=auth_headers,
        )
    sess = await db_session.get(SensorSession, "step-sess")
    assert sess.total_steps == 25


async def test_upload_writes_sync_event(client, auth_headers, db_session):
    from sqlalchemy import select
    with _pg_insert_patch():
        await client.post(
            "/api/upload",
            json=_batch(gateway_id="audit-gw"),
            headers=auth_headers,
        )
    result = await db_session.execute(
        select(SyncEvent).where(SyncEvent.gateway_id == "audit-gw")
    )
    events = result.scalars().all()
    assert len(events) == 1
    assert events[0].samples_received == 3


async def test_upload_updates_gateway_last_sync(client, auth_headers, db_session):
    with _pg_insert_patch():
        await client.post(
            "/api/upload",
            json=_batch(gateway_id="sync-time-gw"),
            headers=auth_headers,
        )
    gw = await db_session.get(Gateway, "sync-time-gw")
    assert gw.last_sync is not None


async def test_upload_rejects_oversized_batch(client, auth_headers):
    """Batches exceeding MAX_BATCH_SAMPLES must be rejected with 413."""
    from app.routers.upload import MAX_BATCH_SAMPLES
    big_batch = {
        "gateway_id": "gw-big",
        "session_id": "big-sess",
        "samples": [_sample(i) for i in range(MAX_BATCH_SAMPLES + 1)],
        "batch_sequence": 1,
    }
    response = await client.post("/api/upload", json=big_batch, headers=auth_headers)
    assert response.status_code == 413


async def test_upload_empty_samples_is_accepted(client, auth_headers):
    """An empty batch is a valid no-op (e.g. gateway keepalive)."""
    empty = {
        "gateway_id": "gw-empty",
        "session_id": "empty-sess",
        "samples": [],
        "batch_sequence": 1,
    }
    with _pg_insert_patch():
        response = await client.post("/api/upload", json=empty, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["accepted"] is True
