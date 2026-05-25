"""
Shared test fixtures for the RPM backend test suite.

Strategy
--------
* Environment variables are injected at module load time (before any app
  imports) so that pydantic-settings picks them up on first use.
* Each test gets a fresh SQLite in-memory database via the `db_session`
  fixture.  The FastAPI `get_db` dependency is overridden with this session
  so that route handlers never touch the production PostgreSQL database.
* The upload router uses a PostgreSQL-specific dialect INSERT; that call is
  patched in test_upload.py.  All other routers use standard SQLAlchemy
  queries that work identically on SQLite.
"""

import os

# ── Must be set BEFORE any app module is imported ─────────────────────
TEST_API_KEY = "test-api-key-not-for-production"
os.environ.setdefault("RPM_API_KEY", TEST_API_KEY)
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("DATABASE_URL_SYNC", "sqlite:///:memory:")
os.environ.setdefault("RPM_ALLOWED_ORIGINS", "*")
os.environ.setdefault("RPM_DEBUG", "false")

# ── Standard imports (after env vars are set) ─────────────────────────
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
)
from sqlalchemy.pool import StaticPool

# App-level imports (settings are already seeded from env above)
from app.config import get_settings
from app.database import Base, get_db
from app.main import app

# Clear any cached settings so the test env vars are read fresh
get_settings.cache_clear()


# ── Database fixture ──────────────────────────────────────────────────

@pytest_asyncio.fixture()
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Spin up a fresh in-memory SQLite database per test, create all tables,
    and yield a session.  The entire database is discarded after the test.
    """
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        yield session

    await engine.dispose()


# ── HTTP client fixture ───────────────────────────────────────────────

@pytest_asyncio.fixture()
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    AsyncClient wired to the FastAPI app with `get_db` overridden to use
    the per-test SQLite session.  No Authorization header by default; use
    `auth_headers` for endpoints that require API-key auth.
    """
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as c:
            yield c
    finally:
        app.dependency_overrides.pop(get_db, None)


# ── Auth helpers ──────────────────────────────────────────────────────

@pytest.fixture()
def auth_headers() -> dict:
    """Valid Authorization header for gateway-facing API endpoints."""
    return {"Authorization": f"Bearer {TEST_API_KEY}"}


@pytest.fixture()
def bad_auth_headers() -> dict:
    return {"Authorization": "Bearer wrong-key"}


# ── Model factories ───────────────────────────────────────────────────

@pytest_asyncio.fixture()
async def gateway(db_session: AsyncSession):
    """A persisted Gateway row, available to tests that need one."""
    from app.models import Gateway
    gw = Gateway(id="gw-test-0001", label="Test Gateway", location="Room 101")
    db_session.add(gw)
    await db_session.commit()
    await db_session.refresh(gw)
    return gw


@pytest_asyncio.fixture()
async def patient(db_session: AsyncSession):
    """A persisted Patient row."""
    from app.models import Patient
    p = Patient(label="Alice Example")
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    return p


@pytest_asyncio.fixture()
async def gateway_with_patient(db_session: AsyncSession, gateway, patient):
    """Gateway already assigned to a patient."""
    gateway.patient_id = patient.id
    await db_session.commit()
    await db_session.refresh(gateway)
    return gateway
