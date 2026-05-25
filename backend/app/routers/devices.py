"""
Device, gateway, and patient management endpoints.
Also handles gateway heartbeats.
"""

import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import verify_api_key
from ..database import get_db
from ..models import Gateway, Patient, Device
from ..schemas import HeartbeatIn, GatewayRegister, PatientCreate, PatientOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["devices"])

ONLINE_THRESHOLD = timedelta(minutes=5)


# ── Heartbeat ────────────────────────────────────────────────────────

@router.post("/heartbeat", dependencies=[Depends(verify_api_key)])
async def gateway_heartbeat(hb: HeartbeatIn, db: AsyncSession = Depends(get_db)):
    """Receive periodic heartbeat from a gateway."""
    now = datetime.now(timezone.utc)

    gw = await db.get(Gateway, hb.gateway_id)
    if gw is None:
        gw = Gateway(id=hb.gateway_id, label=f"auto-{hb.gateway_id[:8]}")
        db.add(gw)

    gw.last_heartbeat = now
    gw.is_online = True
    gw.ble_connected = hb.ble_connected
    gw.pending_samples = hb.pending_samples
    if hb.software_version:
        gw.software_version = hb.software_version

    await db.commit()
    return {"status": "ok"}


# ── Gateway registration ─────────────────────────────────────────────

@router.post("/gateways/register", dependencies=[Depends(verify_api_key)])
async def register_gateway(reg: GatewayRegister, db: AsyncSession = Depends(get_db)):
    """Register or update a gateway."""
    gw = await db.get(Gateway, reg.gateway_id)
    if gw is None:
        gw = Gateway(id=reg.gateway_id)
        db.add(gw)

    if reg.label:
        gw.label = reg.label
    if reg.patient_id:
        gw.patient_id = reg.patient_id
    if reg.device_id:
        gw.device_id = reg.device_id
    if reg.location:
        gw.location = reg.location
    if reg.software_version:
        gw.software_version = reg.software_version

    await db.commit()
    return {"status": "registered", "gateway_id": gw.id}


@router.get("/gateways", dependencies=[Depends(verify_api_key)])
async def list_gateways(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Gateway).order_by(Gateway.created_at))
    gateways = result.scalars().all()

    now = datetime.now(timezone.utc)
    out = []
    for gw in gateways:
        # Compute online status without mutating the ORM object
        is_online = bool(
            gw.last_heartbeat and (now - gw.last_heartbeat) < ONLINE_THRESHOLD
        )
        out.append({
            "id": gw.id,
            "label": gw.label,
            "patient_id": gw.patient_id,
            "is_online": is_online,
            "ble_connected": gw.ble_connected,
            "last_heartbeat": gw.last_heartbeat.isoformat() if gw.last_heartbeat else None,
            "last_sync": gw.last_sync.isoformat() if gw.last_sync else None,
            "pending_samples": gw.pending_samples,
        })

    return out


# ── Patients ─────────────────────────────────────────────────────────

@router.post("/patients", response_model=PatientOut, dependencies=[Depends(verify_api_key)])
async def create_patient(body: PatientCreate, db: AsyncSession = Depends(get_db)):
    p = Patient(label=body.label, notes=body.notes)
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


@router.get("/patients", dependencies=[Depends(verify_api_key)])
async def list_patients(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Patient).order_by(Patient.created_at))
    patients = result.scalars().all()
    return [{"id": p.id, "label": p.label, "created_at": p.created_at.isoformat()} for p in patients]
