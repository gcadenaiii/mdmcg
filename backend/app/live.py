"""
In-process WebSocket broadcaster for live sensor data.

A lightweight fan-out: when the upload endpoint accepts a batch, it calls
broadcast() which pushes the samples to all connected WebSocket clients
watching that gateway.

NOTE: Works correctly with a single uvicorn worker (the PoC default).
Multi-worker deployments would need an external broker (Redis pub/sub, etc.).
"""

import json
from collections import defaultdict
from typing import Dict, Set

from fastapi import WebSocket


class LiveBroadcaster:
    def __init__(self) -> None:
        self._clients: Dict[str, Set[WebSocket]] = defaultdict(set)

    async def connect(self, gateway_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._clients[gateway_id].add(ws)

    def disconnect(self, gateway_id: str, ws: WebSocket) -> None:
        self._clients[gateway_id].discard(ws)

    async def broadcast(self, gateway_id: str, payload: dict) -> None:
        """Send payload (JSON-serialisable dict) to all watchers of gateway_id."""
        if not self._clients.get(gateway_id):
            return  # nobody listening — fast exit

        dead = []
        message = json.dumps(payload)
        for ws in set(self._clients[gateway_id]):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._clients[gateway_id].discard(ws)


# Module-level singleton shared across the whole process
broadcaster = LiveBroadcaster()
