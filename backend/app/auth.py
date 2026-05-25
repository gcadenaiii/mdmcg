"""
Simple bearer-token authentication for the PoC.

The gateway sends:   Authorization: Bearer <api_key>
The backend checks against the configured RPM_API_KEY environment variable.

For production, replace with JWT / OAuth2 / mTLS.
"""

import hmac

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import get_settings

bearer_scheme = HTTPBearer()


async def verify_api_key(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
) -> str:
    """FastAPI dependency that validates the bearer token."""
    if not hmac.compare_digest(credentials.credentials, get_settings().api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
    return credentials.credentials
