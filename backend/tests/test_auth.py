"""
Tests for API-key authentication middleware.

Covers:
- Missing Authorization header → 403
- Wrong key → 401
- Correct key → request proceeds
- Timing-safe comparison (hmac.compare_digest) is in use
"""

import hmac
import pytest


async def test_missing_auth_header_returns_401(client):
    """Endpoints that require auth must reject requests with no header."""
    response = await client.post("/api/heartbeat", json={
        "gateway_id": "gw-1",
        "timestamp": 1700000000.0,
    })
    assert response.status_code == 401


async def test_wrong_api_key_returns_401(client, bad_auth_headers):
    response = await client.post(
        "/api/heartbeat",
        json={"gateway_id": "gw-1", "timestamp": 1700000000.0},
        headers=bad_auth_headers,
    )
    assert response.status_code == 401
    assert "Invalid API key" in response.json()["detail"]


async def test_valid_api_key_is_accepted(client, auth_headers):
    response = await client.post(
        "/api/heartbeat",
        json={"gateway_id": "gw-1", "timestamp": 1700000000.0},
        headers=auth_headers,
    )
    assert response.status_code == 200


async def test_auth_uses_hmac_compare_digest():
    """Verify auth.py uses constant-time comparison (security requirement)."""
    import inspect
    import app.auth as auth_module

    source = inspect.getsource(auth_module)
    assert "hmac.compare_digest" in source, (
        "auth.py must use hmac.compare_digest() for constant-time key comparison"
    )
