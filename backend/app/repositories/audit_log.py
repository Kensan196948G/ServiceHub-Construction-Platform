"""監査ログリポジトリ (Phase 2e)

AuditLog レコードの作成・検索操作を提供する。
全 ADMIN 操作の監査証跡記録 (ISO27001) に使用される。
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


class AuditLogRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        *,
        action: str,
        resource: str,
        user_id: uuid.UUID | None = None,
        resource_id: uuid.UUID | None = None,
        before_data: dict[str, Any] | None = None,
        after_data: dict[str, Any] | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AuditLog:
        """監査ログを 1 件作成して flush する。

        Args:
            action:      操作種別 (READ / CREATE / UPDATE / DELETE / LOGIN)
            resource:    対象リソース名 (notification_deliveries / projects / etc.)
            user_id:     操作ユーザー ID (None = system / unauthenticated)
            resource_id: 対象リソースの ID (一覧取得の場合は None)
            before_data: 変更前データ (READ では None)
            after_data:  変更後データ / クエリパラメータなどのメタ情報
            ip_address:  クライアント IP アドレス
            user_agent:  クライアント User-Agent ヘッダ
        """
        log = AuditLog(
            action=action,
            resource=resource,
            user_id=user_id,
            resource_id=resource_id,
            before_data=before_data,
            after_data=after_data,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(log)
        await self.db.flush()
        await self.db.refresh(log)
        return log
