"""通知送信チャンネル実装パッケージ (Email / Slack)"""

from app.services.notification_senders.email_sender import (
    EmailSender,
    FailureKind,
    SendResult,
)
from app.services.notification_senders.slack_sender import SlackSender

__all__ = ["EmailSender", "SlackSender", "SendResult", "FailureKind"]
