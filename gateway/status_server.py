"""
Local status HTTP server for the RPM gateway.

Exposes a lightweight endpoint on the Pi's LAN so you can check gateway
health from a browser or curl without needing cloud connectivity.

Endpoints:
    GET /           → JSON status summary
    GET /health     → 200 OK if running
"""

import json
import logging
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Optional, Callable

logger = logging.getLogger(__name__)


class StatusHandler(BaseHTTPRequestHandler):
    """Simple request handler — reads status from the server's .get_status callback."""

    def do_GET(self):
        try:
            if self.path == "/health":
                self._reply(200, {"status": "ok"})
            elif self.path in ("/", "/status"):
                status = self.server.get_status()  # type: ignore[attr-defined]
                self._reply(200, status)
            else:
                self._reply(404, {"error": "not found"})
        except Exception as e:
            logger.exception("Status endpoint error")
            self._reply(500, {"error": "status_unavailable", "detail": str(e)})

    def _reply(self, code: int, body: dict):
        payload = json.dumps(body, indent=2).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, fmt, *args):
        """Suppress default stderr logging."""
        logger.debug(fmt, *args)


def run_status_server(host: str, port: int, get_status: Callable[[], dict]) -> None:
    """Run the blocking HTTP status server (call from a thread)."""
    server = HTTPServer((host, port), StatusHandler)
    server.get_status = get_status  # type: ignore[attr-defined]
    logger.info("Status server listening on http://%s:%d", host, port)
    server.serve_forever()
