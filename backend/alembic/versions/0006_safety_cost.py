"""安全・品質・原価・工数テーブル作成

Revision ID: 0006_safety_cost
Revises: 0005_photos
Create Date: 2026-04-02
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0006_safety_cost"
down_revision: Union[str, None] = "0005_photos"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # safety_checks
    op.create_table(
        "safety_checks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("check_date", sa.Date(), nullable=False),
        sa.Column("check_type", sa.String(50), nullable=False, server_default="DAILY"),
        sa.Column("items_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("items_ok", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("items_ng", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("overall_result", sa.String(10), nullable=False, server_default="PENDING"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("inspector_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.text("NOW()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_safety_checks_project_id", "safety_checks", ["project_id"])

    # quality_inspections
    op.create_table(
        "quality_inspections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("inspection_date", sa.Date(), nullable=False),
        sa.Column("inspection_type", sa.String(100), nullable=False),
        sa.Column("target_item", sa.String(200), nullable=False),
        sa.Column("standard_value", sa.String(100), nullable=True),
        sa.Column("measured_value", sa.String(100), nullable=True),
        sa.Column("result", sa.String(10), nullable=False, server_default="PENDING"),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.text("NOW()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_quality_inspections_project_id", "quality_inspections", ["project_id"])

    # cost_records
    op.create_table(
        "cost_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("record_date", sa.Date(), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("budgeted_amount", sa.Numeric(15, 0), nullable=False, server_default="0"),
        sa.Column("actual_amount", sa.Numeric(15, 0), nullable=False, server_default="0"),
        sa.Column("vendor_name", sa.String(200), nullable=True),
        sa.Column("invoice_number", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.text("NOW()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_cost_records_project_id", "cost_records", ["project_id"])

    # work_hours
    op.create_table(
        "work_hours",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("worker_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("work_date", sa.Date(), nullable=False),
        sa.Column("hours", sa.Numeric(5, 2), nullable=False),
        sa.Column("work_type", sa.String(50), nullable=False, server_default="REGULAR"),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.text("NOW()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_work_hours_project_id", "work_hours", ["project_id"])


def downgrade() -> None:
    op.drop_table("work_hours")
    op.drop_table("cost_records")
    op.drop_table("quality_inspections")
    op.drop_table("safety_checks")
