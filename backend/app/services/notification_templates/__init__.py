"""通知テンプレート (Jinja2)

Phase 2a では疎通テスト用の最小セットのみ配置する。Phase 2c でドメイン
イベント別テンプレ (daily_report_submitted, safety_incident_created, ...)
を追加していく。

テンプレートの探索は `TemplateRenderer` 経由で行う。呼び出し側は
`render(event_key, channel, context)` だけ知っていれば良い。
"""

from app.services.notification_templates.renderer import (
    TemplateNotFoundError,
    TemplateRenderer,
)

__all__ = ["TemplateRenderer", "TemplateNotFoundError"]
