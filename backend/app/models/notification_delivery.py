"""通知配信ログモデル（SQLAlchemy）

Phase 2a: NotificationDispatcher が通知を送信する際、送信前に PENDING 行を
挿入し、送信完了後に SENT / FAILED へ更新する (事前書き込み方式)。
この方式により送信途中クラッシュが RETRY 候補として残り、Phase 2d のリトライ
機構が status スキャンで回収できる。

Phase 2d: failure_kind カラムを追加。'transient' のみリトライ対象。
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class NotificationDelivery(Base):
    __tablename__ = "notification_deliveries"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    event_key: Mapped[str] = mapped_column(String(100), nullable=False)
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")
    subject: Mapped[str | None] = mapped_column(String(300), nullable=True)
    # Body preview is capped at 500 chars in application layer to limit PII exposure.
    body_preview: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Phase 2d: 'transient' | 'permanent' | None — used by retry scanner
    failure_kind: Mapped[str | None] = mapped_column(String(20), nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index(
            "ix_notification_deliveries_user_event_created",
            "user_id",
            "event_key",
            "created_at",
        ),
        Index(
            "ix_notification_deliveries_status_created",
            "status",
            "created_at",
        ),
        Index(
            "ix_notification_deliveries_retry",
            "status",
            "failure_kind",
            "attempts",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<NotificationDelivery id={self.id} user_id={self.user_id} "
            f"event={self.event_key} channel={self.channel} status={self.status}>"
        )
