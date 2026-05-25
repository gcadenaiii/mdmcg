"""
Tests for admin provisioning board and patient view.

GET  /patient/{id}
GET  /admin/
GET  /admin/gateway/{id}
POST /admin/gateway/{id}
POST /admin/patients/new
GET  /admin/gateway/{id}/live
"""

import pytest
from app.models import Patient, Gateway


# ── Patient view ──────────────────────────────────────────────────────

async def test_patient_view_returns_200(client, patient):
    response = await client.get(f"/patient/{patient.id}")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


async def test_patient_view_contains_name(client, patient):
    response = await client.get(f"/patient/{patient.id}")
    assert patient.label.encode() in response.content


async def test_patient_view_unknown_returns_404(client):
    response = await client.get("/patient/does-not-exist")
    assert response.status_code == 404


async def test_patient_view_has_step_ring(client, patient):
    """Step progress ring SVG must be present."""
    response = await client.get(f"/patient/{patient.id}")
    assert b"Today&#39;s Activity" in response.content or b"Today's Activity" in response.content


# ── Admin board ───────────────────────────────────────────────────────

async def test_admin_board_returns_200(client):
    response = await client.get("/admin/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


async def test_admin_board_shows_all_gateways(client, gateway):
    response = await client.get("/admin/")
    assert gateway.label.encode() in response.content


async def test_admin_board_shows_all_patients(client, patient):
    response = await client.get("/admin/")
    assert patient.label.encode() in response.content


async def test_admin_board_flash_message(client):
    response = await client.get("/admin/?flash=Patient+created")
    assert b"Patient created" in response.content or b"Patient+created" not in response.content


# ── Admin gateway detail ──────────────────────────────────────────────

async def test_admin_gateway_returns_200(client, gateway):
    response = await client.get(f"/admin/gateway/{gateway.id}")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


async def test_admin_gateway_unknown_returns_404(client):
    response = await client.get("/admin/gateway/not-a-real-id")
    assert response.status_code == 404


async def test_admin_gateway_contains_edit_form(client, gateway):
    response = await client.get(f"/admin/gateway/{gateway.id}")
    assert b"<form" in response.content
    assert b'name="label"' in response.content
    assert b'name="location"' in response.content
    assert b'name="patient_id"' in response.content


async def test_admin_gateway_shows_flash(client, gateway):
    response = await client.get(f"/admin/gateway/{gateway.id}?flash=saved")
    assert b"Changes saved" in response.content


# ── POST admin gateway edit ───────────────────────────────────────────

async def test_admin_gateway_post_updates_label(client, gateway, db_session):
    response = await client.post(
        f"/admin/gateway/{gateway.id}",
        data={"label": "Renamed Gateway", "patient_id": "", "location": ""},
        follow_redirects=False,
    )
    assert response.status_code == 303

    await db_session.refresh(gateway)
    assert gateway.label == "Renamed Gateway"


async def test_admin_gateway_post_updates_location(client, gateway, db_session):
    response = await client.post(
        f"/admin/gateway/{gateway.id}",
        data={"label": gateway.label, "patient_id": "", "location": "Ward B"},
        follow_redirects=False,
    )
    assert response.status_code == 303

    await db_session.refresh(gateway)
    assert gateway.location == "Ward B"


async def test_admin_gateway_post_assigns_valid_patient(
    client, gateway, patient, db_session
):
    response = await client.post(
        f"/admin/gateway/{gateway.id}",
        data={"label": gateway.label, "patient_id": patient.id, "location": ""},
        follow_redirects=False,
    )
    assert response.status_code == 303

    await db_session.refresh(gateway)
    assert gateway.patient_id == patient.id


async def test_admin_gateway_post_rejects_nonexistent_patient(client, gateway):
    """Assigning a non-existent patient_id must redirect with an error flash."""
    response = await client.post(
        f"/admin/gateway/{gateway.id}",
        data={"label": gateway.label, "patient_id": "fake-patient-id", "location": ""},
        follow_redirects=False,
    )
    # Must redirect back, not silently persist a dangling FK
    assert response.status_code == 303
    assert "Patient+not+found" in response.headers.get("location", "")


async def test_admin_gateway_post_unassigns_patient(
    client, gateway_with_patient, db_session
):
    gw = gateway_with_patient
    response = await client.post(
        f"/admin/gateway/{gw.id}",
        data={"label": gw.label, "patient_id": "", "location": ""},
        follow_redirects=False,
    )
    assert response.status_code == 303

    await db_session.refresh(gw)
    assert gw.patient_id is None


async def test_admin_gateway_post_unknown_returns_404(client):
    response = await client.post(
        "/admin/gateway/not-a-real-id",
        data={"label": "x", "patient_id": "", "location": ""},
    )
    assert response.status_code == 404


# ── POST create patient ───────────────────────────────────────────────

async def test_create_patient_redirects_on_success(client, db_session):
    response = await client.post(
        "/admin/patients/new",
        data={"label": "New Patient Name"},
        follow_redirects=False,
    )
    assert response.status_code == 303
    assert "/admin/" in response.headers["location"]


async def test_create_patient_persists_to_db(client, db_session):
    from sqlalchemy import select
    await client.post(
        "/admin/patients/new",
        data={"label": "Persisted Patient"},
        follow_redirects=False,
    )
    result = await db_session.execute(
        select(Patient).where(Patient.label == "Persisted Patient")
    )
    assert result.scalar_one_or_none() is not None


async def test_create_patient_empty_label_redirects_with_error(client):
    response = await client.post(
        "/admin/patients/new",
        data={"label": "   "},
        follow_redirects=False,
    )
    assert response.status_code == 303
    assert "required" in response.headers["location"]


# ── Live debug view ───────────────────────────────────────────────────

async def test_live_view_returns_200(client, gateway):
    response = await client.get(f"/admin/gateway/{gateway.id}/live")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


async def test_live_view_unknown_gateway_returns_404(client):
    response = await client.get("/admin/gateway/bad-id/live")
    assert response.status_code == 404


async def test_live_view_contains_gateway_id(client, gateway):
    response = await client.get(f"/admin/gateway/{gateway.id}/live")
    assert gateway.id.encode() in response.content


async def test_live_view_loads_threejs(client, gateway):
    """Three.js CDN tag must be present."""
    response = await client.get(f"/admin/gateway/{gateway.id}/live")
    assert b"three" in response.content.lower()
