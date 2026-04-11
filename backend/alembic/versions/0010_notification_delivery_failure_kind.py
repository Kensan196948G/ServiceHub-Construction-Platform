"""Add failure_kind column to notification_deliveries

Revision ID: 0010
Revises: 0009
Create Date: 2026-04-11

Phase 2d: store failure_kind ('transient'|'permanent') per delivery row so that
the retry scanner can pick up only transient failures.
"""

import sqlalchemy as sa
from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "notification_deliveries",
        sa.Column("failure_kind", sa.String(20), nullable=True),
    )
    # Index for retry scanner: FAILED + failure_kind=transient + attempts < 3
    op.create_index(
        "ix_notification_deliveries_retry",
        "notification_deliveries",
        ["status", "failure_kind", "attempts"],
    )


def downgrade() -> None:
    op.drop_index("ix_notification_deliveries_retry", "notification_deliveries")
    op.drop_column("notification_deliveries", "failure_kind")
