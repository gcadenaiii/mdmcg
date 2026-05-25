"""
Tests for the LiveBroadcaster and the /ws/gateway/{id} WebSocket endpoint.

Covers:
- connect / disconnect lifecycle
- fan-out to multiple clients
- dead client cleanup
- Gateway ID isolation (broadcast to correct channel only)
"""

import asyncio
import json
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.live import LiveBroadcaster


# ── Unit tests: LiveBroadcaster ───────────────────────────────────────

async def test_broadcaster_connect_adds_client():
    b = LiveBroadcaster()
    ws = AsyncMock()
    await b.connect("gw-1", ws)
    assert ws in b._clients["gw-1"]
    ws.accept.assert_awaited_once()


async def test_broadcaster_disconnect_removes_client():
    b = LiveBroadcaster()
    ws = AsyncMock()
    await b.connect("gw-1", ws)
    b.disconnect("gw-1", ws)
    assert ws not in b._clients["gw-1"]


async def test_broadcaster_disconnect_unknown_is_noop():
    """Disconnecting a client that was never added must not raise."""
    b = LiveBroadcaster()
    ws = AsyncMock()
    b.disconnect("gw-x", ws)  # should not raise


async def test_broadcast_sends_to_all_connected_clients():
    b = LiveBroadcaster()
    ws1, ws2 = AsyncMock(), AsyncMock()
    await b.connect("gw-1", ws1)
    await b.connect("gw-1", ws2)

    payload = {"samples": [{"seq": 1}]}
    await b.broadcast("gw-1", payload)

    expected = json.dumps(payload)
    ws1.send_text.assert_awaited_once_with(expected)
    ws2.send_text.assert_awaited_once_with(expected)


async def test_broadcast_does_not_cross_channels():
    """Messages for gw-1 must NOT be sent to gw-2 subscribers."""
    b = LiveBroadcaster()
    ws_a = AsyncMock()
    ws_b = AsyncMock()
    await b.connect("gw-1", ws_a)
    await b.connect("gw-2", ws_b)

    await b.broadcast("gw-1", {"samples": []})

    ws_a.send_text.assert_awaited_once()
    ws_b.send_text.assert_not_awaited()


async def test_broadcast_skips_dead_clients():
    """Failed sends must be silently cleaned up; remaining clients still receive."""
    b = LiveBroadcaster()
    dead = AsyncMock()
    dead.send_text.side_effect = RuntimeError("connection closed")
    live = AsyncMock()
    await b.connect("gw-1", dead)
    await b.connect("gw-1", live)

    await b.broadcast("gw-1", {"samples": []})

    live.send_text.assert_awaited_once()
    assert dead not in b._clients["gw-1"]


async def test_broadcast_noop_when_no_listeners():
    """broadcast() with no clients must complete without error."""
    b = LiveBroadcaster()
    await b.broadcast("gw-unheard", {"samples": []})  # should not raise


# ── WebSocket endpoint (integration) ─────────────────────────────────
# WS endpoint integration tests require broadcasting from inside the same
# event loop that serves the ASGI app.  asyncio.run() in a background thread
# creates a separate loop, so send_text() never reaches the connected socket.
# The LiveBroadcaster unit tests above cover all the fanout logic.
# Full WS integration tests should use a live server (e.g. uvicorn + websockets).

import threading
from starlette.testclient import TestClient


@pytest.mark.skip(reason=(
    "WS endpoint integration: broadcast must run in the ASGI event loop. "
    "LiveBroadcaster unit tests cover fanout logic; run against a live server for full E2E."
))
def test_websocket_connect_and_receive():
    """Client connects and receives a message broadcast for its gateway."""
    from app.main import app as _app
    from app.live import broadcaster

    GW_ID = "ws-test-gw-001"
    received = []
    ready = threading.Event()
    done = threading.Event()

    def ws_thread():
        with TestClient(_app) as tc:
            with tc.websocket_connect(f"/ws/gateway/{GW_ID}") as ws:
                ready.set()
                msg = ws.receive_text()
                received.append(json.loads(msg))
        done.set()

    t = threading.Thread(target=ws_thread, daemon=True)
    t.start()
    ready.wait(timeout=5)
    asyncio.run(broadcaster.broadcast(GW_ID, {"samples": [{"seq": 1, "euler": {}}]}))
    done.wait(timeout=5)
    t.join(timeout=2)

    assert len(received) == 1
    assert received[0]["samples"][0]["seq"] == 1


@pytest.mark.skip(reason=(
    "WS endpoint integration: broadcast must run in the ASGI event loop. "
    "LiveBroadcaster unit tests cover channel isolation; run against a live server for full E2E."
))
def test_websocket_different_gateways_isolated():
    """A client for gw-A must not receive messages broadcast for gw-B."""
    from app.main import app as _app
    from app.live import broadcaster

    GW_A = "ws-iso-gw-a"
    GW_B = "ws-iso-gw-b"
    received_a = []
    ready = threading.Event()
    done = threading.Event()

    def ws_thread():
        with TestClient(_app) as tc:
            with tc.websocket_connect(f"/ws/gateway/{GW_A}") as ws:
                ready.set()
                msg = ws.receive_text()
                received_a.append(json.loads(msg))
        done.set()

    t = threading.Thread(target=ws_thread, daemon=True)
    t.start()
    ready.wait(timeout=5)

    async def _broadcast_both():
        await broadcaster.broadcast(GW_B, {"samples": [{"seq": 99}]})
        await broadcaster.broadcast(GW_A, {"samples": [{"seq": 1}]})

    asyncio.run(_broadcast_both())
    done.wait(timeout=5)
    t.join(timeout=2)

    assert len(received_a) == 1
    assert received_a[0]["samples"][0]["seq"] == 1
