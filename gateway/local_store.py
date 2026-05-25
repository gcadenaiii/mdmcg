"""
Local durable storage for sensor samples on the Raspberry Pi gateway.

Uses SQLite in WAL mode for crash safety. Samples are written as they arrive
and marked as synced only after the backend acknowledges receipt.

Design:
- WAL journal mode survives power loss without corruption
- sequence_number is monotonic and never reused
- sync_status tracks each sample's upload state
- The sync worker reads PENDING rows in batch, uploads, then marks SYNCED
- On startup, any rows left in UPLOADING state are reset to PENDING (crash recovery)
"""

import logging
import sqlite3
import json
import time
from pathlib import Path
from typing import List, Optional, Tuple

logger = logging.getLogger(__name__)


class LocalStore:
    """SQLite-backed durable buffer for sensor samples."""

    SCHEMA_VERSION = 1

    def __init__(self, db_path: str):
        self.db_path = db_path
        self._conn: Optional[sqlite3.Connection] = None

    # ── Lifecycle ────────────────────────────────────────────────────

    def open(self) -> None:
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        # The gateway serves status from a background HTTP thread,
        # so this connection must be usable across threads.
        self._conn = sqlite3.connect(
            self.db_path,
            isolation_level=None,
            check_same_thread=False,
        )
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA synchronous=NORMAL")
        self._conn.execute("PRAGMA busy_timeout=5000")
        self._init_schema()
        self._recover_uploading()
        logger.info("Local store opened: %s", self.db_path)

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None

    # ── Schema ───────────────────────────────────────────────────────

    def _init_schema(self) -> None:
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS samples (
                sequence_number INTEGER PRIMARY KEY,
                timestamp       REAL    NOT NULL,
                session_id      TEXT    NOT NULL,
                data_json       TEXT    NOT NULL,
                step_count      INTEGER DEFAULT 0,
                sync_status     TEXT    DEFAULT 'pending',
                created_at      REAL    DEFAULT (strftime('%s','now')),
                synced_at       REAL    DEFAULT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_samples_sync
                ON samples(sync_status);

            CREATE INDEX IF NOT EXISTS idx_samples_session
                ON samples(session_id);

            CREATE TABLE IF NOT EXISTS meta (
                key   TEXT PRIMARY KEY,
                value TEXT
            );

            CREATE TABLE IF NOT EXISTS sync_log (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_sequence INTEGER NOT NULL,
                samples_sent   INTEGER NOT NULL,
                accepted       INTEGER DEFAULT 0,
                error_message  TEXT    DEFAULT NULL,
                attempted_at   REAL   DEFAULT (strftime('%s','now'))
            );
        """)

        # Store schema version
        self._conn.execute(
            "INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)",
            (str(self.SCHEMA_VERSION),)
        )

    def _recover_uploading(self) -> None:
        """Reset any rows stuck in 'uploading' back to 'pending' (crash recovery)."""
        cur = self._conn.execute(
            "UPDATE samples SET sync_status = 'pending' WHERE sync_status = 'uploading'"
        )
        if cur.rowcount > 0:
            logger.warning("Recovered %d samples from interrupted upload", cur.rowcount)

    # ── Write ────────────────────────────────────────────────────────

    def next_sequence(self) -> int:
        """Return the next monotonic sequence number."""
        row = self._conn.execute(
            "SELECT MAX(sequence_number) FROM samples"
        ).fetchone()
        return (row[0] or 0) + 1

    def insert_sample(
        self,
        sequence_number: int,
        timestamp: float,
        session_id: str,
        data: dict,
        step_count: int = 0,
    ) -> None:
        """Insert a single sensor sample into the local buffer."""
        self._conn.execute(
            """INSERT OR IGNORE INTO samples
               (sequence_number, timestamp, session_id, data_json, step_count)
               VALUES (?, ?, ?, ?, ?)""",
            (sequence_number, timestamp, session_id, json.dumps(data), step_count)
        )

    def insert_samples_batch(self, rows: List[Tuple]) -> None:
        """Bulk insert: list of (seq, timestamp, session_id, data_json, step_count)."""
        self._conn.executemany(
            """INSERT OR IGNORE INTO samples
               (sequence_number, timestamp, session_id, data_json, step_count)
               VALUES (?, ?, ?, ?, ?)""",
            rows
        )

    # ── Read for sync ────────────────────────────────────────────────

    def get_pending_batch(self, limit: int = 200) -> List[dict]:
        """Fetch a batch of unsynced samples, marking them as 'uploading'.

        This two-phase approach prevents re-sending during concurrent syncs.
        """
        rows = self._conn.execute(
            """SELECT sequence_number, timestamp, session_id, data_json, step_count
               FROM samples
               WHERE sync_status = 'pending'
               ORDER BY sequence_number ASC
               LIMIT ?""",
            (limit,)
        ).fetchall()

        if not rows:
            return []

        seq_numbers = [r[0] for r in rows]
        placeholders = ",".join("?" * len(seq_numbers))
        self._conn.execute(
            f"UPDATE samples SET sync_status = 'uploading' WHERE sequence_number IN ({placeholders})",
            seq_numbers
        )

        return [
            {
                "sequence_number": r[0],
                "timestamp": r[1],
                "session_id": r[2],
                "data": json.loads(r[3]),
                "step_count": r[4],
            }
            for r in rows
        ]

    def mark_synced(self, up_to_sequence: int) -> int:
        """Mark all samples up to (inclusive) a sequence number as synced."""
        now = time.time()
        cur = self._conn.execute(
            """UPDATE samples
               SET sync_status = 'synced', synced_at = ?
               WHERE sequence_number <= ? AND sync_status IN ('uploading', 'pending')""",
            (now, up_to_sequence)
        )
        return cur.rowcount

    def mark_batch_failed(self, seq_numbers: List[int]) -> None:
        """Reset samples back to pending after a failed upload."""
        if not seq_numbers:
            return
        placeholders = ",".join("?" * len(seq_numbers))
        self._conn.execute(
            f"UPDATE samples SET sync_status = 'pending' WHERE sequence_number IN ({placeholders})",
            seq_numbers
        )

    # ── Sync log ─────────────────────────────────────────────────────

    def log_sync_attempt(
        self, batch_sequence: int, samples_sent: int, accepted: bool, error: str = ""
    ) -> None:
        self._conn.execute(
            """INSERT INTO sync_log (batch_sequence, samples_sent, accepted, error_message)
               VALUES (?, ?, ?, ?)""",
            (batch_sequence, samples_sent, 1 if accepted else 0, error)
        )

    # ── Stats ────────────────────────────────────────────────────────

    def pending_count(self) -> int:
        row = self._conn.execute(
            "SELECT COUNT(*) FROM samples WHERE sync_status = 'pending'"
        ).fetchone()
        return row[0]

    def total_count(self) -> int:
        row = self._conn.execute("SELECT COUNT(*) FROM samples").fetchone()
        return row[0]

    def synced_count(self) -> int:
        row = self._conn.execute(
            "SELECT COUNT(*) FROM samples WHERE sync_status = 'synced'"
        ).fetchone()
        return row[0]

    def last_sync_time(self) -> Optional[float]:
        row = self._conn.execute(
            "SELECT MAX(synced_at) FROM samples WHERE sync_status = 'synced'"
        ).fetchone()
        return row[0] if row else None

    def prune_synced(self, keep_recent: int = 10000) -> int:
        """Delete old synced samples to save disk space. Keeps the most recent N."""
        cur = self._conn.execute(
            """DELETE FROM samples
               WHERE sync_status = 'synced'
               AND sequence_number < (
                   SELECT sequence_number FROM samples
                   WHERE sync_status = 'synced'
                   ORDER BY sequence_number DESC
                   LIMIT 1 OFFSET ?
               )""",
            (keep_recent,)
        )
        if cur.rowcount > 0:
            self._conn.execute("PRAGMA incremental_vacuum")
            logger.info("Pruned %d old synced samples", cur.rowcount)
        return cur.rowcount

    # ── Meta ─────────────────────────────────────────────────────────

    def get_meta(self, key: str, default: str = "") -> str:
        row = self._conn.execute(
            "SELECT value FROM meta WHERE key = ?", (key,)
        ).fetchone()
        return row[0] if row else default

    def set_meta(self, key: str, value: str) -> None:
        self._conn.execute(
            "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
            (key, value)
        )
