"""
Health check endpoint — used by load balancers, Docker HEALTHCHECK, and monitoring.
"""

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    http_status = 200 if db_ok else 503
    return JSONResponse(
        status_code=http_status,
        content={"status": "healthy" if db_ok else "degraded", "database": db_ok},
    )
