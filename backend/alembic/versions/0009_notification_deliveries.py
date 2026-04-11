"""Notification deliveries table

Revision ID: 0009
Revises: 0008
Create Date: 2026-04-11
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notification_deliveries",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("event_key", sa.String(100), nullable=False),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'PENDING'"),
        ),
        sa.Column("subject", sa.String(300), nullable=True),
        sa.Column("body_preview", sa.Text, nullable=True),
        sa.Column("error_detail", sa.Text, nullable=True),
        sa.Column(
            "attempts",
            sa.Integer,
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_notification_deliveries_user_event_created",
        "notification_deliveries",
        ["user_id", "event_key", "created_at"],
    )
    op.create_index(
        "ix_notification_deliveries_status_created",
        "notification_deliveries",
        ["status", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_notification_deliveries_status_created", "notification_deliveries"
    )
    op.drop_index(
        "ix_notification_deliveries_user_event_created", "notification_deliveries"
    )
    op.drop_table("notification_deliveries")
