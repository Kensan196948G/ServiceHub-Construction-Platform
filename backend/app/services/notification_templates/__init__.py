"""通知テンプレート (Jinja2)

Phase 2a では Email 疎通テスト用の最小セットのみ配置した。
Phase 2b で Slack 対応テンプレを追加。Phase 2c でドメイン
イベント別テンプレ (daily_report_submitted, safety_incident_created, ...)
を追加していく。

テンプレートの探索は `TemplateRenderer` 経由で行う。
"""

from app.services.notification_templates.renderer import (
    RenderedEmail,
    RenderedSlack,
    TemplateNotFoundError,
    TemplateRenderer,
)

__all__ = [
    "TemplateRenderer",
    "TemplateNotFoundError",
    "RenderedEmail",
    "RenderedSlack",
]
