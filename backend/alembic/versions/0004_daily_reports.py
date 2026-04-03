"""日報テーブル作成

Revision ID: 0004_daily_reports
Revises: 0003_projects
Create Date: 2026-04-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_daily_reports"
down_revision: str | None = "0003_projects"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "daily_reports",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("report_date", sa.Date(), nullable=False),
        sa.Column("weather", sa.String(20), nullable=True),
        sa.Column("temperature", sa.Integer(), nullable=True),
        sa.Column("worker_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("work_content", sa.Text(), nullable=True),
        sa.Column("safety_check", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("safety_notes", sa.Text(), nullable=True),
        sa.Column("progress_rate", sa.Integer(), nullable=True),
        sa.Column("issues", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="DRAFT"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_daily_reports_project_id", "daily_reports", ["project_id"])
    op.create_index("ix_daily_reports_report_date", "daily_reports", ["report_date"])


def downgrade() -> None:
    op.drop_table("daily_reports")
