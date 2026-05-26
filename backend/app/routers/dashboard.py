"""
Dashboard router — serves the clinician web UI and its data endpoints.

Uses Jinja2 server-rendered templates (lightest option for this PoC).
"""

import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, Request, Query, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Gateway, Patient, SensorSession, SensorSample, SyncEvent
from ..schemas import DashboardData, GatewaySummary, SessionSummary

logger = logging.getLogger(__name__)
router = APIRouter(tags=["dashboard"])

TEMPLATES_DIR = Path(__file__).resolve().parent.parent.parent / "templates"
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

ONLINE_THRESHOLD = timedelta(minutes=5)


# ── HTML pages ───────────────────────────────────────────────────────

@router.get("/", response_class=HTMLResponse)
async def dashboard_page(request: Request, db: AsyncSession = Depends(get_db)):
    data = await _get_dashboard_data(db)
    data["online_count"] = sum(1 for gw in data["gateways"] if gw["is_online"])
    return templates.TemplateResponse(
        request=request,
        name="dashboard.html",
        context={"request": request, "data": data},
    )


@router.get("/gateway/{gateway_id}", response_class=HTMLResponse)
async def gateway_detail_page(
    gateway_id: str, request: Request, db: AsyncSession = Depends(get_db)
):
    gw = await db.get(Gateway, gateway_id)
    if not gw:
        return HTMLResponse("<h1>Gateway not found</h1>", status_code=404)

    # Recent sessions
    result = await db.execute(
        select(SensorSession)
        .where(SensorSession.gateway_id == gateway_id)
        .order_by(desc(SensorSession.created_at))
        .limit(20)
    )
    sessions = result.scalars().all()

    # Recent samples
    result = await db.execute(
        select(SensorSample)
        .where(SensorSample.gateway_id == gateway_id)
        .order_by(desc(SensorSample.timestamp))
        .limit(100)
    )
    samples = result.scalars().all()

    # Sync events
    result = await db.execute(
        select(SyncEvent)
        .where(SyncEvent.gateway_id == gateway_id)
        .order_by(desc(SyncEvent.received_at))
        .limit(20)
    )
    sync_events = result.scalars().all()

    # Patient info
    patient = await db.get(Patient, gw.patient_id) if gw.patient_id else None

    return templates.TemplateResponse(
        request=request,
        name="gateway_detail.html",
        context={
            "request": request,
            "gateway": gw,
            "patient": patient,
            "sessions": sessions,
            "samples": samples,
            "sync_events": sync_events,
        },
    )


# ── JSON API ─────────────────────────────────────────────────────────

@router.get("/api/dashboard")
async def dashboard_data(db: AsyncSession = Depends(get_db)):
    return await _get_dashboard_data(db)


@router.get("/api/gateway/{gateway_id}")
async def gateway_detail_api(
    gateway_id: str, db: AsyncSession = Depends(get_db)
):
    from fastapi import HTTPException
    gw = await db.get(Gateway, gateway_id)
    if not gw:
        raise HTTPException(status_code=404, detail="Gateway not found")

    now = datetime.now(timezone.utc)
    is_online = bool(gw.last_heartbeat and (now - gw.last_heartbeat) < ONLINE_THRESHOLD)
    patient = await db.get(Patient, gw.patient_id) if gw.patient_id else None

    result = await db.execute(
        select(SensorSession)
        .where(SensorSession.gateway_id == gateway_id)
        .order_by(desc(SensorSession.created_at))
        .limit(20)
    )
    sessions = result.scalars().all()

    result = await db.execute(
        select(SensorSample)
        .where(SensorSample.gateway_id == gateway_id)
        .order_by(desc(SensorSample.timestamp))
        .limit(100)
    )
    samples = result.scalars().all()

    result = await db.execute(
        select(SyncEvent)
        .where(SyncEvent.gateway_id == gateway_id)
        .order_by(desc(SyncEvent.received_at))
        .limit(20)
    )
    sync_events = result.scalars().all()

    return {
        "gateway": {
            "id": gw.id,
            "label": gw.label,
            "patient_id": gw.patient_id,
            "patient_label": patient.label if patient else None,
            "is_online": is_online,
            "ble_connected": gw.ble_connected,
            "last_heartbeat": gw.last_heartbeat.isoformat() if gw.last_heartbeat else None,
            "last_sync": gw.last_sync.isoformat() if gw.last_sync else None,
            "pending_samples": gw.pending_samples or 0,
            "software_version": getattr(gw, "software_version", None),
        },
        "patient": {
            "id": patient.id,
            "label": patient.label,
            "notes": getattr(patient, "notes", None),
            "created_at": patient.created_at.isoformat() if patient.created_at else None,
        } if patient else None,
        "sessions": [
            {
                "id": s.id,
                "gateway_id": s.gateway_id,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "ended_at": s.ended_at.isoformat() if s.ended_at else None,
                "sample_count": s.sample_count or 0,
                "total_steps": s.total_steps or 0,
            }
            for s in sessions
        ],
        "samples": [
            {
                "timestamp": s.timestamp.isoformat(),
                "euler": {"x": s.euler_x, "y": s.euler_y, "z": s.euler_z},
                "linear_acceleration": {
                    "x": s.linear_accel_x, "y": s.linear_accel_y, "z": s.linear_accel_z
                },
                "step_count": s.step_count,
                "calibration": {
                    "system": s.cal_system, "gyroscope": s.cal_gyro,
                    "accelerometer": s.cal_accel, "magnetometer": s.cal_mag,
                },
            }
            for s in samples
        ],
        "sync_events": [
            {
                "id": e.id,
                "gateway_id": e.gateway_id,
                "received_at": e.received_at.isoformat(),
                "batch_sequence": e.batch_sequence,
                "samples_accepted": e.samples_accepted or 0,
                "success": e.success,
                "error_message": e.error_message,
            }
            for e in sync_events
        ],
    }


@router.get("/api/patient/{patient_id}")
async def patient_detail_api(
    patient_id: str, db: AsyncSession = Depends(get_db)
):
    from fastapi import HTTPException
    patient = await db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(Gateway).where(Gateway.patient_id == patient_id).order_by(Gateway.created_at)
    )
    gateways_raw = result.scalars().all()
    gateway_ids = [gw.id for gw in gateways_raw]

    is_online = any(
        gw.last_heartbeat and (now - gw.last_heartbeat) < ONLINE_THRESHOLD
        for gw in gateways_raw
    )
    ble_connected = any(gw.ble_connected for gw in gateways_raw)

    total_steps = 0
    total_samples = 0
    sessions_raw = []
    if gateway_ids:
        row = (await db.execute(
            select(func.sum(SensorSession.total_steps), func.sum(SensorSession.sample_count))
            .where(SensorSession.gateway_id.in_(gateway_ids))
        )).one()
        total_steps = row[0] or 0
        total_samples = row[1] or 0

        result = await db.execute(
            select(SensorSession)
            .where(SensorSession.gateway_id.in_(gateway_ids))
            .order_by(desc(SensorSession.started_at))
            .limit(20)
        )
        sessions_raw = result.scalars().all()

    return {
        "patient": {
            "id": patient.id,
            "label": patient.label,
            "notes": getattr(patient, "notes", None),
            "created_at": patient.created_at.isoformat() if patient.created_at else None,
        },
        "gateways": [
            {
                "id": gw.id,
                "label": gw.label,
                "patient_id": gw.patient_id,
                "patient_label": patient.label,
                "is_online": bool(gw.last_heartbeat and (now - gw.last_heartbeat) < ONLINE_THRESHOLD),
                "ble_connected": gw.ble_connected,
                "last_heartbeat": gw.last_heartbeat.isoformat() if gw.last_heartbeat else None,
                "last_sync": gw.last_sync.isoformat() if gw.last_sync else None,
                "pending_samples": gw.pending_samples or 0,
                "software_version": getattr(gw, "software_version", None),
            }
            for gw in gateways_raw
        ],
        "sessions": [
            {
                "id": s.id,
                "gateway_id": s.gateway_id,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "ended_at": s.ended_at.isoformat() if s.ended_at else None,
                "sample_count": s.sample_count or 0,
                "total_steps": s.total_steps or 0,
            }
            for s in sessions_raw
        ],
        "is_online": is_online,
        "ble_connected": ble_connected,
        "total_samples": total_samples,
        "total_steps": total_steps,
    }


@router.get("/api/gateway/{gateway_id}/samples")
async def gateway_samples(
    gateway_id: str,
    limit: int = Query(200, le=1000),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SensorSample)
        .where(SensorSample.gateway_id == gateway_id)
        .order_by(desc(SensorSample.timestamp))
        .limit(limit)
    )
    samples = result.scalars().all()
    return [
        {
            "timestamp": s.timestamp.isoformat(),
            "euler": {"x": s.euler_x, "y": s.euler_y, "z": s.euler_z},
            "linear_acceleration": {
                "x": s.linear_accel_x, "y": s.linear_accel_y, "z": s.linear_accel_z
            },
            "step_count": s.step_count,
            "calibration": {
                "system": s.cal_system, "gyroscope": s.cal_gyro,
                "accelerometer": s.cal_accel, "magnetometer": s.cal_mag,
            },
        }
        for s in samples
    ]


# ── Internal helpers ─────────────────────────────────────────────────

async def _get_dashboard_data(db: AsyncSession) -> dict:
    now = datetime.now(timezone.utc)

    # Gateways
    result = await db.execute(select(Gateway).order_by(Gateway.created_at))
    gateways_raw = result.scalars().all()

    gateways = []
    for gw in gateways_raw:
        online = bool(
            gw.last_heartbeat and (now - gw.last_heartbeat) < ONLINE_THRESHOLD
        )
        patient_label = None
        if gw.patient_id:
            p = await db.get(Patient, gw.patient_id)
            patient_label = p.label if p else None

        gateways.append({
            "id": gw.id,
            "label": gw.label,
            "patient_label": patient_label,
            "is_online": online,
            "ble_connected": gw.ble_connected,
            "last_heartbeat": gw.last_heartbeat.isoformat() if gw.last_heartbeat else None,
            "last_sync": gw.last_sync.isoformat() if gw.last_sync else None,
            "pending_samples": gw.pending_samples or 0,
        })

    # Recent sessions
    result = await db.execute(
        select(SensorSession).order_by(desc(SensorSession.created_at)).limit(10)
    )
    sessions = [
        {
            "id": s.id,
            "gateway_id": s.gateway_id,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
            "sample_count": s.sample_count or 0,
            "total_steps": s.total_steps or 0,
        }
        for s in result.scalars().all()
    ]

    # Totals
    total_samples = (await db.execute(
        select(func.count(SensorSample.id))
    )).scalar() or 0
    total_patients = (await db.execute(
        select(func.count(Patient.id))
    )).scalar() or 0

    return {
        "gateways": gateways,
        "recent_sessions": sessions,
        "total_samples": total_samples,
        "total_patients": total_patients,
    }


# ── Phase 2: Patient view ────────────────────────────────────────────

@router.get("/patient/{patient_id}", response_class=HTMLResponse)
async def patient_view(patient_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    patient = await db.get(Patient, patient_id)
    if not patient:
        return HTMLResponse("<h1>Patient not found</h1>", status_code=404)

    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(Gateway).where(Gateway.patient_id == patient_id).order_by(Gateway.created_at)
    )
    gateways = result.scalars().all()
    gateway_ids = [gw.id for gw in gateways]

    is_online = any(
        gw.last_heartbeat and (now - gw.last_heartbeat) < ONLINE_THRESHOLD
        for gw in gateways
    )
    ble_connected = any(gw.ble_connected for gw in gateways)

    # All-time totals
    total_steps = 0
    total_samples = 0
    session_count = 0
    last_session = None
    recent_sessions = []
    if gateway_ids:
        row = (await db.execute(
            select(func.count(SensorSession.id),
                   func.sum(SensorSession.total_steps),
                   func.sum(SensorSession.sample_count))
            .where(SensorSession.gateway_id.in_(gateway_ids))
        )).one()
        session_count  = row[0] or 0
        total_steps    = row[1] or 0
        total_samples  = row[2] or 0

        result = await db.execute(
            select(SensorSession)
            .where(SensorSession.gateway_id.in_(gateway_ids))
            .order_by(desc(SensorSession.started_at))
            .limit(10)
        )
        recent_sessions = result.scalars().all()
        if recent_sessions:
            last_session = recent_sessions[0]

    # Today's steps (UTC)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_steps = 0
    if gateway_ids:
        today_steps = (await db.execute(
            select(func.sum(SensorSession.total_steps))
            .where(SensorSession.gateway_id.in_(gateway_ids),
                   SensorSession.started_at >= today_start)
        )).scalar() or 0

    daily_goal = 2000
    ring_filled = round(min(today_steps / daily_goal, 1.0) * 327, 1)

    return templates.TemplateResponse(
        request=request,
        name="patient.html",
        context={
            "request": request,
            "patient": patient,
            "gateways": gateways,
            "is_online": is_online,
            "ble_connected": ble_connected,
            "total_steps": total_steps,
            "today_steps": today_steps,
            "last_session": last_session,
            "recent_sessions": recent_sessions,
            "session_count": session_count,
            "total_samples": total_samples,
            "daily_goal": daily_goal,
            "ring_filled": ring_filled,
        },
    )


# ── Phase 2: Admin provisioning board ───────────────────────────────

@router.get("/admin/", response_class=HTMLResponse)
async def admin_board(request: Request, db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)

    result = await db.execute(select(Gateway).order_by(Gateway.created_at))
    gateways_raw = result.scalars().all()

    gateways = []
    for gw in gateways_raw:
        online = bool(gw.last_heartbeat and (now - gw.last_heartbeat) < ONLINE_THRESHOLD)
        patient = await db.get(Patient, gw.patient_id) if gw.patient_id else None
        row = (await db.execute(
            select(func.count(SensorSession.id), func.sum(SensorSession.total_steps))
            .where(SensorSession.gateway_id == gw.id)
        )).one()
        gateways.append({
            "id": gw.id,
            "label": gw.label,
            "location": gw.location,
            "software_version": gw.software_version,
            "last_heartbeat": gw.last_heartbeat,
            "last_sync": gw.last_sync,
            "ble_connected": gw.ble_connected,
            "pending_samples": gw.pending_samples or 0,
            "is_online": online,
            "patient": patient,
            "session_count": row[0] or 0,
            "total_steps": row[1] or 0,
        })

    result = await db.execute(select(Patient).order_by(Patient.label))
    patients = result.scalars().all()

    return templates.TemplateResponse(
        request=request,
        name="admin.html",
        context={
            "request": request,
            "gateways": gateways,
            "patients": patients,
            "online_count": sum(1 for g in gateways if g["is_online"]),
            "flash": request.query_params.get("flash"),
        },
    )


# ── Phase 2: Admin gateway detail + edit ────────────────────────────

@router.get("/admin/gateway/{gateway_id}", response_class=HTMLResponse)
async def admin_gateway_get(
    gateway_id: str, request: Request, db: AsyncSession = Depends(get_db)
):
    gw = await db.get(Gateway, gateway_id)
    if not gw:
        return HTMLResponse("<h1>Gateway not found</h1>", status_code=404)

    now = datetime.now(timezone.utc)
    is_online = bool(gw.last_heartbeat and (now - gw.last_heartbeat) < ONLINE_THRESHOLD)
    patient = await db.get(Patient, gw.patient_id) if gw.patient_id else None

    result = await db.execute(select(Patient).order_by(Patient.label))
    all_patients = result.scalars().all()

    result = await db.execute(
        select(SensorSession)
        .where(SensorSession.gateway_id == gateway_id)
        .order_by(desc(SensorSession.started_at))
        .limit(30)
    )
    sessions = result.scalars().all()

    totals = (await db.execute(
        select(func.count(SensorSession.id),
               func.sum(SensorSession.total_steps),
               func.sum(SensorSession.sample_count))
        .where(SensorSession.gateway_id == gateway_id)
    )).one()

    return templates.TemplateResponse(
        request=request,
        name="admin_gateway.html",
        context={
            "request": request,
            "gateway": gw,
            "patient": patient,
            "all_patients": all_patients,
            "sessions": sessions,
            "is_online": is_online,
            "total_sessions": totals[0] or 0,
            "total_steps":    totals[1] or 0,
            "total_samples":  totals[2] or 0,
            "flash": request.query_params.get("flash"),
        },
    )


@router.post("/admin/gateway/{gateway_id}")
async def admin_gateway_post(
    gateway_id: str,
    db: AsyncSession = Depends(get_db),
    label:      str = Form(""),
    patient_id: str = Form(""),
    location:   str = Form(""),
):
    gw = await db.get(Gateway, gateway_id)
    if not gw:
        return HTMLResponse("<h1>Gateway not found</h1>", status_code=404)
    gw.label    = label.strip() or gw.label
    gw.location = location.strip() or None
    pid = patient_id.strip()
    if pid:
        if not await db.get(Patient, pid):
            return RedirectResponse(
                url=f"/admin/gateway/{gateway_id}?flash=Patient+not+found",
                status_code=303,
            )
        gw.patient_id = pid
    else:
        gw.patient_id = None
    await db.commit()
    return RedirectResponse(url=f"/admin/gateway/{gateway_id}?flash=saved", status_code=303)


@router.post("/admin/patients/new")
async def admin_create_patient(
    db: AsyncSession = Depends(get_db),
    label: str = Form(""),
):
    label = label.strip()
    if not label:
        return RedirectResponse(url="/admin/?flash=Patient+name+required", status_code=303)
    p = Patient(label=label)
    db.add(p)
    await db.commit()
    return RedirectResponse(url="/admin/?flash=Patient+created", status_code=303)


# ── Phase 3: Live debug view ────────────────────────────────────

@router.get("/admin/gateway/{gateway_id}/live", response_class=HTMLResponse)
async def live_view(
    gateway_id: str, request: Request, db: AsyncSession = Depends(get_db)
):
    gw = await db.get(Gateway, gateway_id)
    if not gw:
        return HTMLResponse("<h1>Gateway not found</h1>", status_code=404)
    patient = await db.get(Patient, gw.patient_id) if gw.patient_id else None
    return templates.TemplateResponse(
        request=request,
        name="live.html",
        context={"request": request, "gateway": gw, "patient": patient},
    )
