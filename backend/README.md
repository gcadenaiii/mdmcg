# RPM Backend

FastAPI cloud backend for the Remote Patient Monitoring (RPM) PoC.  Receives sensor data from Raspberry Pi gateways over HTTPS, stores it in PostgreSQL, and serves a multi-role clinical web interface.

---

## Architecture

```
Pi Gateway ──(HTTPS/JSON)──► FastAPI ──► PostgreSQL
                                │
                          Jinja2 templates
                                │
              ┌─────────────────┼─────────────────┐
        Caregiver           Patient view      Developer/Admin
        dashboard            (/patient/)      (/admin/ + /live)
```

---

## Local Development

### Prerequisites

- Python 3.11+
- Docker + Docker Compose (for PostgreSQL)

### Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate       # Linux/macOS
.\.venv\Scripts\Activate.ps1    # Windows PowerShell

# Install runtime dependencies
pip install -r requirements.txt

# Install dev/test dependencies
pip install -r requirements-dev.txt

# Start PostgreSQL
cd ../infra && docker compose up -d db && cd ../backend

# Configure environment
cp .env.example .env   # then edit .env with your values

# Run the dev server (auto-reload)
uvicorn app.main:app --reload --port 8080
```

Open `http://localhost:8080/` for the caregiver dashboard.

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | SQLite fallback | Async PostgreSQL DSN (`postgresql+asyncpg://...`) |
| `DATABASE_URL_SYNC` | Yes | SQLite fallback | Sync DSN for Alembic (`postgresql://...`) |
| `RPM_API_KEY` | Yes | `dev-api-key-change-me` | Bearer token required by gateway API endpoints |
| `RPM_DEBUG` | No | `false` | Enable SQLAlchemy query logging |
| `RPM_ALLOWED_ORIGINS` | No | `*` | Comma-separated CORS origins |

> **Security**: Change `RPM_API_KEY` and all default passwords before any deployment accessible from the internet.

---

## Running Tests

```bash
cd backend

# Run the full unit/integration suite
pytest

# With coverage report
pytest --cov=app --cov-report=term-missing

# Verbose output
pytest -v

# Run a single test file
pytest tests/test_devices.py
```

### Test Architecture

Tests use an in-memory SQLite database per test function — no external services required.

| File | What it covers |
|---|---|
| `tests/test_health.py` | `/health` endpoint, 503 on DB failure |
| `tests/test_auth.py` | API key auth, missing/wrong header, timing-safe comparison |
| `tests/test_schemas.py` | All Pydantic schema validation logic |
| `tests/test_devices.py` | Heartbeat, gateway register, patient CRUD |
| `tests/test_upload.py` | Batch upload, session creation, audit log, size limits |
| `tests/test_dashboard.py` | HTML render + JSON API routes |
| `tests/test_admin.py` | Admin board, gateway edit, patient create, live view |
| `tests/test_live.py` | LiveBroadcaster unit + WebSocket endpoint |

Tests marked `@pytest.mark.integration` require a live PostgreSQL database and are skipped by default.

---

## API Reference

All gateway-facing endpoints require `Authorization: Bearer <RPM_API_KEY>`.

### Gateway

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/heartbeat` | Periodic gateway status ping |
| `POST` | `/api/gateways/register` | Register or update a gateway |
| `GET` | `/api/gateways` | List all registered gateways |

### Sensor Data

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload a batch of sensor samples (max 5000/batch) |

### Patients

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/patients` | Create a patient record |
| `GET` | `/api/patients` | List all patients |

### Web UI (no auth required for PoC)

| Path | Description |
|---|---|
| `GET /` | Caregiver overview dashboard |
| `GET /gateway/{id}` | Gateway detail with session history |
| `GET /patient/{id}` | Patient view — step ring, plain-English device status |
| `GET /admin/` | Admin provisioning board |
| `GET /admin/gateway/{id}` | Edit gateway label/patient/location |
| `POST /admin/gateway/{id}` | Save gateway edits |
| `POST /admin/patients/new` | Create a new patient |
| `GET /admin/gateway/{id}/live` | Live sensor debug view (Three.js) |
| `WS /ws/gateway/{id}` | WebSocket stream for live debug view |
| `GET /health` | Health check (`200` healthy, `503` degraded) |

---

## Docker Deployment

```bash
cd infra

# First time / after Python/template changes:
docker compose build backend && docker compose up -d backend

# After static file changes only:
docker compose restart backend

# View logs:
docker compose logs -f backend

# Database migrations (Alembic):
docker compose exec backend alembic upgrade head
```

> **Note**: The production image runs as a non-root user (`appuser`) for container security.

---

## Project Structure

```
backend/
├── app/
│   ├── main.py          Entry point — routers, CORS, WebSocket, lifespan
│   ├── config.py        pydantic-settings configuration
│   ├── database.py      Async SQLAlchemy engine and session factory
│   ├── auth.py          API key bearer-token dependency
│   ├── models.py        ORM models (Patient, Gateway, SensorSession, SensorSample, SyncEvent)
│   ├── schemas.py       Pydantic request/response schemas
│   ├── live.py          In-process WebSocket fan-out broadcaster
│   └── routers/
│       ├── dashboard.py Caregiver/patient/admin HTML + JSON endpoints
│       ├── devices.py   Gateway management and heartbeat
│       ├── upload.py    Sensor batch ingest
│       └── health.py    Health check
├── templates/           Jinja2 HTML templates
├── static/              CSS (rpm.css) and JS (rpm-components.js)
├── tests/               pytest test suite
├── alembic/             Database migrations
├── requirements.txt     Runtime dependencies
├── requirements-dev.txt Test dependencies
├── pytest.ini           pytest configuration
└── Dockerfile           Production container (non-root, single worker)
```
