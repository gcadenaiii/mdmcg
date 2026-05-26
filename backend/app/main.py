"""
RPM Backend — FastAPI application.

Entry point for the cloud backend that receives data from Pi gateways
and serves the clinician dashboard.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import engine, Base
from .routers import upload, devices, dashboard, health
from .live import broadcaster

logger = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (for dev; use Alembic in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ensured")
    yield
    await engine.dispose()


app = FastAPI(
    title="RPM Backend",
    version="0.1.0",
    lifespan=lifespan,
    root_path=get_settings().root_path,
)

# CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(upload.router)
app.include_router(devices.router)
app.include_router(dashboard.router)
app.include_router(health.router)

# WebSocket: live sensor stream per gateway
@app.websocket("/ws/gateway/{gateway_id}")
async def ws_live_gateway(websocket: WebSocket, gateway_id: str):
    await broadcaster.connect(gateway_id, websocket)
    try:
        while True:
            # Keep connection open; ignore any client messages (ping/pong)
            await websocket.receive_text()
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        broadcaster.disconnect(gateway_id, websocket)

# Static files for dashboard
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
