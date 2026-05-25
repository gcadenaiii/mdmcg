"""
Tests for device/gateway/patient management endpoints.

POST /api/heartbeat
POST /api/gateways/register
GET  /api/gateways
POST /api/patients
GET  /api/patients

All endpoints require a valid Bearer token.
"""

import pytest
from datetime import datetime, timezone

from app.models import Gateway, Patient


# ── Heartbeat ─────────────────────────────────────────────────────────

async def test_heartbeat_creates_gateway(client, auth_headers, db_session):
    response = await client.post(
        "/api/heartbeat",
        json={"gateway_id": "hb-gw-001", "timestamp": 1700000000.0, "ble_connected": True},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

    gw = await db_session.get(Gateway, "hb-gw-001")
    assert gw is not None
    assert gw.is_online is True
    assert gw.ble_connected is True


async def test_heartbeat_updates_existing_gateway(client, auth_headers, gateway, db_session):
    response = await client.post(
        "/api/heartbeat",
        json={
            "gateway_id": gateway.id,
            "timestamp": 1700000000.0,
            "ble_connected": True,
            "pending_samples": 42,
            "software_version": "1.2.3",
        },
        headers=auth_headers,
    )
    assert response.status_code == 200

    await db_session.refresh(gateway)
    assert gateway.ble_connected is True
    assert gateway.pending_samples == 42
    assert gateway.software_version == "1.2.3"


async def test_heartbeat_requires_auth(client):
    response = await client.post(
        "/api/heartbeat",
        json={"gateway_id": "gw-x", "timestamp": 1700000000.0},
    )
    assert response.status_code == 401


# ── Gateway registration ──────────────────────────────────────────────

async def test_register_gateway_creates_new(client, auth_headers, db_session):
    response = await client.post(
        "/api/gateways/register",
        json={
            "gateway_id": "reg-gw-001",
            "label": "Hallway Gateway",
            "location": "Floor 2",
            "software_version": "2.0.0",
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["gateway_id"] == "reg-gw-001"

    gw = await db_session.get(Gateway, "reg-gw-001")
    assert gw.label == "Hallway Gateway"
    assert gw.location == "Floor 2"


async def test_register_gateway_updates_existing(client, auth_headers, gateway, db_session):
    response = await client.post(
        "/api/gateways/register",
        json={"gateway_id": gateway.id, "label": "Updated Label"},
        headers=auth_headers,
    )
    assert response.status_code == 200

    await db_session.refresh(gateway)
    assert gateway.label == "Updated Label"


async def test_register_gateway_requires_auth(client):
    response = await client.post(
        "/api/gateways/register",
        json={"gateway_id": "gw-y"},
    )
    assert response.status_code == 401


# ── List gateways ─────────────────────────────────────────────────────

async def test_list_gateways_empty(client, auth_headers):
    response = await client.get("/api/gateways", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


async def test_list_gateways_returns_all(client, auth_headers, gateway):
    response = await client.get("/api/gateways", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == gateway.id


async def test_list_gateways_online_status_computed_not_persisted(
    client, auth_headers, gateway, db_session
):
    """
    GET /api/gateways must compute is_online on the fly without writing
    to the database (no uncommitted ORM mutation).
    """
    from datetime import timedelta
    # Gateway has no heartbeat yet → is_online should be False in response
    response = await client.get("/api/gateways", headers=auth_headers)
    data = response.json()
    assert data[0]["is_online"] is False

    # DB object must NOT have been dirtied
    await db_session.refresh(gateway)
    assert gateway.is_online is False  # the stored value is still False


async def test_list_gateways_requires_auth(client):
    response = await client.get("/api/gateways")
    assert response.status_code == 401


# ── Patients ──────────────────────────────────────────────────────────

async def test_create_patient(client, auth_headers, db_session):
    response = await client.post(
        "/api/patients",
        json={"label": "Bob Patient"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["label"] == "Bob Patient"
    assert "id" in body
    assert "created_at" in body


async def test_create_patient_with_notes(client, auth_headers):
    response = await client.post(
        "/api/patients",
        json={"label": "Carol", "notes": "Diabetic, allergic to penicillin"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["label"] == "Carol"


async def test_list_patients_empty(client, auth_headers):
    response = await client.get("/api/patients", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


async def test_list_patients_returns_created(client, auth_headers, patient):
    response = await client.get("/api/patients", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == patient.id
    assert data[0]["label"] == patient.label


async def test_create_patient_requires_auth(client):
    response = await client.post("/api/patients", json={"label": "Dave"})
    assert response.status_code == 401
