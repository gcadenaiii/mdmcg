"""
Tests for the caregiver dashboard — HTML templates and JSON API.

GET /                         → dashboard.html
GET /gateway/{id}             → gateway_detail.html
GET /api/dashboard            → JSON summary
GET /api/gateway/{id}/samples → JSON sample list
"""

import pytest
from app.models import Gateway, Patient, SensorSession, SensorSample
from datetime import datetime, timezone


# ── HTML routes: caregiver dashboard ─────────────────────────────────

async def test_dashboard_root_returns_200(client):
    response = await client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


async def test_dashboard_root_contains_rpm_css(client):
    response = await client.get("/")
    assert b"rpm.css" in response.content


async def test_dashboard_root_with_gateway(client, gateway):
    response = await client.get("/")
    assert response.status_code == 200
    assert gateway.label.encode() in response.content


async def test_gateway_detail_returns_200(client, gateway):
    response = await client.get(f"/gateway/{gateway.id}")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


async def test_gateway_detail_contains_gateway_id(client, gateway):
    response = await client.get(f"/gateway/{gateway.id}")
    assert gateway.id[:8].encode() in response.content


async def test_gateway_detail_unknown_returns_404(client):
    response = await client.get("/gateway/does-not-exist")
    assert response.status_code == 404


# ── JSON API ──────────────────────────────────────────────────────────

async def test_api_dashboard_returns_json(client):
    response = await client.get("/api/dashboard")
    assert response.status_code == 200
    body = response.json()
    assert "gateways" in body
    assert "recent_sessions" in body
    assert "total_samples" in body
    assert "total_patients" in body


async def test_api_dashboard_counts_gateways(client, gateway):
    response = await client.get("/api/dashboard")
    body = response.json()
    assert len(body["gateways"]) == 1
    assert body["gateways"][0]["id"] == gateway.id


async def test_api_dashboard_counts_patients(client, patient):
    response = await client.get("/api/dashboard")
    body = response.json()
    assert body["total_patients"] == 1


async def test_api_gateway_samples_empty(client, gateway):
    response = await client.get(f"/api/gateway/{gateway.id}/samples")
    assert response.status_code == 200
    assert response.json() == []


async def test_api_gateway_samples_unknown_returns_empty(client):
    response = await client.get("/api/gateway/not-a-real-id/samples")
    assert response.status_code == 200
    assert response.json() == []


async def test_api_gateway_samples_limit_param(client, gateway):
    response = await client.get(f"/api/gateway/{gateway.id}/samples?limit=50")
    assert response.status_code == 200
