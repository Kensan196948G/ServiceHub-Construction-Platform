"""Email 送信チャンネル実装（aiosmtplib ラッパ）

設計判断:
- 失敗を例外で伝播せず `SendResult(ok, error)` で返す。Dispatcher が
  事前書き込みした delivery 行を mark_sent / mark_failed へ一貫して遷移させ、
  Phase 2d のリトライ機構でも同じ戻り値契約を再利用するため。
- aiosmtplib はテスト時に `smtp_cls` 引数経由で差し替え可能。
"""

from dataclasses import dataclass
from email.message import EmailMessage
from typing import Protocol

import aiosmtplib

from app.core.config import Settings


@dataclass(frozen=True)
class SendResult:
    """送信結果。例外を投げない契約のための戻り値オブジェクト。"""

    ok: bool
    error: str | None = None


class _SmtpClient(Protocol):
    """aiosmtplib.send と互換のシグネチャ (テスト差し替え用)。"""

    async def __call__(
        self,
        message: EmailMessage,
        *,
        hostname: str,
        port: int,
        username: str | None,
        password: str | None,
        use_tls: bool,
        start_tls: bool,
        timeout: int,
    ) -> object: ...


class EmailSender:
    """aiosmtplib を用いた Email 送信チャンネル。"""

    def __init__(
        self,
        settings: Settings,
        smtp_send: _SmtpClient | None = None,
    ) -> None:
        self.settings = settings
        # Dependency injection point: unit tests pass a fake coroutine here
        # instead of opening a real SMTP connection.
        self._smtp_send = smtp_send or aiosmtplib.send  # type: ignore[assignment]

    async def send(
        self,
        *,
        to: str,
        subject: str,
        body_text: str,
        body_html: str | None = None,
    ) -> SendResult:
        message = self._build_message(
            to=to, subject=subject, body_text=body_text, body_html=body_html
        )
        try:
            await self._smtp_send(
                message,
                hostname=self.settings.SMTP_HOST,
                port=self.settings.SMTP_PORT,
                username=self.settings.SMTP_USERNAME,
                password=self.settings.SMTP_PASSWORD,
                use_tls=self.settings.SMTP_USE_TLS,
                start_tls=self.settings.SMTP_USE_STARTTLS,
                timeout=self.settings.SMTP_TIMEOUT_SECONDS,
            )
        except Exception as exc:  # noqa: BLE001
            # Intentionally broad: SMTP/network failures should become
            # SendResult(ok=False) rather than propagating to the caller.
            return SendResult(ok=False, error=f"{type(exc).__name__}: {exc}")
        return SendResult(ok=True)

    def _build_message(
        self,
        *,
        to: str,
        subject: str,
        body_text: str,
        body_html: str | None,
    ) -> EmailMessage:
        msg = EmailMessage()
        msg["From"] = (
            f"{self.settings.SMTP_FROM_NAME} <{self.settings.SMTP_FROM_ADDRESS}>"
        )
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body_text)
        if body_html:
            msg.add_alternative(body_html, subtype="html")
        return msg
