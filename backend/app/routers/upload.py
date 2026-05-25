"""
Upload endpoint — receives batches of sensor samples from Pi gateways.

Idempotency: uses ON CONFLICT (gateway_id, sequence_number) DO NOTHING
so retransmitted samples are silently ignored. The ack tells the gateway
the highest sequence_number stored so it can prune its local buffer.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import verify_api_key
from ..database import get_db
from ..live import broadcaster
from ..models import SensorSample, SensorSession, Gateway, SyncEvent
from ..schemas import BatchUpload, BatchAck

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["upload"])

MAX_BATCH_SAMPLES = 5000  # Hard cap to prevent memory exhaustion


@router.post("/upload", response_model=BatchAck, dependencies=[Depends(verify_api_key)])
async def upload_batch(batch: BatchUpload, db: AsyncSession = Depends(get_db)):
    """Accept a batch of sensor samples from a gateway.

    - Inserts samples using ON CONFLICT DO NOTHING for idempotent dedup.
    - Auto-creates or updates the SensorSession row.
    - Updates Gateway.last_sync.
    - Returns highest accepted sequence_number.
    """
    if len(batch.samples) > MAX_BATCH_SAMPLES:
        raise HTTPException(
            status_code=413,
            detail=f"Batch too large: {len(batch.samples)} samples (max {MAX_BATCH_SAMPLES})",
        )

    gw_id = batch.gateway_id
    session_id = batch.session_id

    # Ensure gateway exists (auto-register on first upload)
    gw = await db.get(Gateway, gw_id)
    if gw is None:
        gw = Gateway(id=gw_id, label=f"auto-{gw_id[:8]}")
        db.add(gw)
        await db.flush()

    # Ensure session exists
    sess = await db.get(SensorSession, session_id)
    if sess is None:
        sess = SensorSession(id=session_id, gateway_id=gw_id)
        db.add(sess)
        await db.flush()

    # Build rows for bulk insert
    rows = []
    for s in batch.samples:
        ts = datetime.fromtimestamp(s.timestamp, tz=timezone.utc)
        rows.append({
            "gateway_id": gw_id,
            "session_id": session_id,
            "sequence_number": s.sequence_number,
            "timestamp": ts,
            "euler_x": s.euler.x,
            "euler_y": s.euler.y,
            "euler_z": s.euler.z,
            "accel_x": s.acceleration.x,
            "accel_y": s.acceleration.y,
            "accel_z": s.acceleration.z,
            "gyro_x": s.gyroscope.x,
            "gyro_y": s.gyroscope.y,
            "gyro_z": s.gyroscope.z,
            "linear_accel_x": s.linear_acceleration.x,
            "linear_accel_y": s.linear_acceleration.y,
            "linear_accel_z": s.linear_acceleration.z,
            "cal_system": s.calibration.system,
            "cal_gyro": s.calibration.gyroscope,
            "cal_accel": s.calibration.accelerometer,
            "cal_mag": s.calibration.magnetometer,
            "step_count": s.step_count,
        })

    # Idempotent upsert: ON CONFLICT DO NOTHING
    accepted = 0
    if rows:
        stmt = pg_insert(SensorSample).values(rows).on_conflict_do_nothing(
            constraint="uq_gateway_seq"
        )
        result = await db.execute(stmt)
        # asyncpg may return -1 for rowcount on conflict-filtered statements
        accepted = result.rowcount if result.rowcount >= 0 else 0

    duplicates = len(rows) - accepted

    # Update session stats
    if batch.samples:
        timestamps = [s.timestamp for s in batch.samples]
        sess.started_at = sess.started_at or datetime.fromtimestamp(
            min(timestamps), tz=timezone.utc
        )
        sess.ended_at = datetime.fromtimestamp(max(timestamps), tz=timezone.utc)
        sess.sample_count = (sess.sample_count or 0) + accepted
        sess.total_steps = max(
            sess.total_steps or 0,
            max(s.step_count for s in batch.samples),
        )

    # Get highest sequence stored for this gateway
    result = await db.execute(
        select(func.max(SensorSample.sequence_number)).where(
            SensorSample.gateway_id == gw_id
        )
    )
    highest_seq = result.scalar() or 0

    # Update gateway
    now = datetime.now(timezone.utc)
    gw.last_sync = now
    gw.is_online = True

    # Sync event audit log
    db.add(SyncEvent(
        gateway_id=gw_id,
        batch_sequence=batch.batch_sequence,
        samples_received=len(batch.samples),
        samples_accepted=accepted,
        samples_duplicate=duplicates,
        highest_sequence=highest_seq,
    ))

    await db.commit()

    logger.info(
        "Batch #%d from %s: %d accepted, %d dup, highest_seq=%d",
        batch.batch_sequence, gw_id[:8], accepted, duplicates, highest_seq,
    )

    # Broadcast latest samples to any connected live-debug WebSocket clients
    if batch.samples:
        await broadcaster.broadcast(gw_id, {
            "samples": [
                {
                    "seq":   s.sequence_number,
                    "euler": {"x": s.euler.x, "y": s.euler.y, "z": s.euler.z},
                    "accel": {"x": s.acceleration.x, "y": s.acceleration.y, "z": s.acceleration.z},
                    "cal":   {
                        "sys":   s.calibration.system,
                        "gyro":  s.calibration.gyroscope,
                        "accel": s.calibration.accelerometer,
                        "mag":   s.calibration.magnetometer,
                    },
                    "steps": s.step_count,
                }
                for s in batch.samples
            ]
        })

    return BatchAck(
        accepted=True,
        batch_sequence=batch.batch_sequence,
        samples_accepted=accepted,
        samples_duplicate=duplicates,
        highest_sequence=highest_seq,
        message="ok",
    )
