"""写真・資料テーブル作成

Revision ID: 0005_photos
Revises: 0004_daily_reports
Create Date: 2026-04-02
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0005_photos"
down_revision: Union[str, None] = "0004_daily_reports"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "photos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("daily_report_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("daily_reports.id", ondelete="SET NULL"), nullable=True),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("original_name", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(100), nullable=False),
        sa.Column("file_size", sa.BigInteger(), nullable=False),
        sa.Column("bucket_name", sa.String(100), nullable=False),
        sa.Column("object_key", sa.String(500), nullable=False),
        sa.Column("category", sa.String(50), nullable=False, server_default="GENERAL"),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("taken_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.text("NOW()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_photos_project_id", "photos", ["project_id"])
    op.create_index("ix_photos_category", "photos", ["category"])


def downgrade() -> None:
    op.drop_table("photos")
