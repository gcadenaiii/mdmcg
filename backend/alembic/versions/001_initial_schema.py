"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-04-04
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Patients
    op.create_table(
        "patients",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("label", sa.String(255), nullable=False, server_default=""),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Devices
    op.create_table(
        "devices",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("device_type", sa.String(100), nullable=False, server_default="esp32_ble_bno055"),
        sa.Column("label", sa.String(255), nullable=True),
        sa.Column("firmware_version", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Gateways
    op.create_table(
        "gateways",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("label", sa.String(255), nullable=True),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id"), nullable=True),
        sa.Column("device_id", sa.String(36), sa.ForeignKey("devices.id"), nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("software_version", sa.String(50), nullable=True),
        sa.Column("last_heartbeat", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_sync", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_online", sa.Boolean, server_default=sa.text("false")),
        sa.Column("ble_connected", sa.Boolean, server_default=sa.text("false")),
        sa.Column("pending_samples", sa.Integer, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Sensor sessions
    op.create_table(
        "sensor_sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("gateway_id", sa.String(36), sa.ForeignKey("gateways.id"), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sample_count", sa.Integer, server_default=sa.text("0")),
        sa.Column("total_steps", sa.Integer, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_sessions_gateway", "sensor_sessions", ["gateway_id"])

    # Sensor samples
    op.create_table(
        "sensor_samples",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("gateway_id", sa.String(36), nullable=False),
        sa.Column("session_id", sa.String(36), sa.ForeignKey("sensor_sessions.id"), nullable=True),
        sa.Column("sequence_number", sa.Integer, nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("euler_x", sa.Float),
        sa.Column("euler_y", sa.Float),
        sa.Column("euler_z", sa.Float),
        sa.Column("accel_x", sa.Float),
        sa.Column("accel_y", sa.Float),
        sa.Column("accel_z", sa.Float),
        sa.Column("gyro_x", sa.Float),
        sa.Column("gyro_y", sa.Float),
        sa.Column("gyro_z", sa.Float),
        sa.Column("linear_accel_x", sa.Float),
        sa.Column("linear_accel_y", sa.Float),
        sa.Column("linear_accel_z", sa.Float),
        sa.Column("cal_system", sa.Integer),
        sa.Column("cal_gyro", sa.Integer),
        sa.Column("cal_accel", sa.Integer),
        sa.Column("cal_mag", sa.Integer),
        sa.Column("step_count", sa.Integer, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("gateway_id", "sequence_number", name="uq_gateway_seq"),
    )
    op.create_index("idx_samples_gateway_ts", "sensor_samples", ["gateway_id", "timestamp"])

    # Sync events
    op.create_table(
        "sync_events",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("gateway_id", sa.String(36), sa.ForeignKey("gateways.id"), nullable=False),
        sa.Column("batch_sequence", sa.Integer, nullable=False),
        sa.Column("samples_received", sa.Integer, server_default=sa.text("0")),
        sa.Column("samples_accepted", sa.Integer, server_default=sa.text("0")),
        sa.Column("samples_duplicate", sa.Integer, server_default=sa.text("0")),
        sa.Column("highest_sequence", sa.Integer, server_default=sa.text("0")),
        sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_sync_gateway", "sync_events", ["gateway_id"])


def downgrade() -> None:
    op.drop_table("sync_events")
    op.drop_table("sensor_samples")
    op.drop_table("sensor_sessions")
    op.drop_table("gateways")
    op.drop_table("devices")
    op.drop_table("patients")
