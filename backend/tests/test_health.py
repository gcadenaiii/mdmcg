"""
Tests for GET /health

Covers:
- Happy path: DB accessible → 200 {"status": "healthy"}
- Degraded path: DB raises → 503 {"status": "degraded"}
"""

import pytest
from unittest.mock import AsyncMock, patch
from sqlalchemy.exc import OperationalError


async def test_health_ok(client):
    response = await client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["database"] is True


async def test_health_degraded_returns_503(client):
    """When the database is unreachable, /health must return 503."""
    with patch(
        "app.routers.health.AsyncSession.execute",
        new_callable=AsyncMock,
        side_effect=OperationalError("DB down", None, None),
    ):
        response = await client.get("/health")

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "degraded"
    assert body["database"] is False
