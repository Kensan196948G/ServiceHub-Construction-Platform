"""通知設定スキーマ（Pydantic v2）"""

from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class NotificationPreferenceResponse(BaseModel):
    """通知設定レスポンス"""

    email_enabled: bool
    slack_enabled: bool
    slack_webhook_url: str | None
    events: dict[str, Any]

    model_config = {"from_attributes": True}


class NotificationPreferenceUpdate(BaseModel):
    """通知設定更新（部分更新）"""

    email_enabled: bool | None = None
    slack_enabled: bool | None = None
    slack_webhook_url: HttpUrl | None = Field(
        default=None,
        description="Slack Incoming Webhook URL",
    )
    events: dict[str, Any] | None = Field(
        default=None,
        description="イベント種別ごとの購読設定（完全置換）",
    )


class NotificationTestResponse(BaseModel):
    """通知疎通テストレスポンス (Phase 2b)

    channels にはスケジューリングされたチャンネル (例: ['email', 'slack'])
    が返る。実際の配信は BackgroundTasks で非同期実行されるため、本レスポンス
    は「受理」ステータスに過ぎない。配信結果は notification_deliveries を
    見るか、実際のメール/Slack を確認する。
    """

    scheduled_channels: list[str]
    message: str
