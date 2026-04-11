"""通知送信チャンネル実装パッケージ (Phase 2a: Email, Phase 2b: Slack)"""

from app.services.notification_senders.email_sender import EmailSender, SendResult

__all__ = ["EmailSender", "SendResult"]
