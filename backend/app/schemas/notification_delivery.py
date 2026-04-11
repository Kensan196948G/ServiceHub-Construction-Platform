"""通知配信ログ Pydantic スキーマ (Phase 2d)

ADMIN 配信履歴 API の response model として使用する。
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class NotificationDeliveryResponse(BaseModel):
    """GET /api/v1/notifications/deliveries の 1 件レスポンス。"""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    event_key: str
    channel: str
    status: str
    subject: str | None
    body_preview: str | None
    error_detail: str | None
    failure_kind: Literal["transient", "permanent"] | None
    attempts: int
    sent_at: datetime | None
    created_at: datetime
