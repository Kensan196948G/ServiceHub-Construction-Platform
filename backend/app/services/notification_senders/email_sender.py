"""Email 送信チャンネル実装（aiosmtplib ラッパ）

設計判断:
- 失敗を例外で伝播せず `SendResult(ok, error, failure_kind)` で返す。
  Dispatcher が事前書き込みした delivery 行を mark_sent / mark_failed へ
  一貫して遷移させ、Phase 2d のリトライ機構も同じ戻り値契約を再利用する。
- 失敗は transient / permanent に分類する (Codex review fix)。
  * transient: 接続失敗、タイムアウト、DNS 解決失敗 → リトライ候補
  * permanent: 認証失敗、無効アドレス、4xx/5xx 応答 → リトライ不可
- aiosmtplib はコンストラクタで `smtp_send` callable を差し替えてテスト可能。
"""

from dataclasses import dataclass
from email.message import EmailMessage
from typing import Literal, Protocol

import aiosmtplib
from aiosmtplib.errors import (
    SMTPAuthenticationError,
    SMTPConnectError,
    SMTPConnectResponseError,
    SMTPConnectTimeoutError,
    SMTPDataError,
    SMTPException,
    SMTPNotSupported,
    SMTPRecipientsRefused,
    SMTPResponseException,
    SMTPSenderRefused,
    SMTPServerDisconnected,
    SMTPTimeoutError,
)

from app.core.config import Settings

FailureKind = Literal["transient", "permanent"]


@dataclass(frozen=True)
class SendResult:
    """送信結果。例外を投げない契約のための戻り値オブジェクト。

    failure_kind はリトライ判定に使う:
    - transient: Phase 2d のリトライワーカーが後で再試行すべき
    - permanent: リトライしても直らない (宛先無効・認証失敗など)
    """

    ok: bool
    error: str | None = None
    failure_kind: FailureKind | None = None


# 接続・ネットワーク層の一時的失敗 (Phase 2d リトライ対象)
_TRANSIENT_EXCEPTIONS: tuple[type[BaseException], ...] = (
    SMTPConnectError,
    SMTPConnectTimeoutError,
    SMTPConnectResponseError,
    SMTPServerDisconnected,
    SMTPTimeoutError,
    ConnectionError,
    TimeoutError,
    OSError,  # DNS failure, socket errors
)

# プロトコル層の恒久的失敗 (認証・宛先・コマンド拒否)
_PERMANENT_EXCEPTIONS: tuple[type[BaseException], ...] = (
    SMTPAuthenticationError,
    SMTPRecipientsRefused,
    SMTPSenderRefused,
    SMTPDataError,
    SMTPNotSupported,
)


def _classify(exc: BaseException) -> FailureKind:
    """例外を transient / permanent に分類する。

    未知の SMTP 例外は安全側に倒して permanent とする
    (リトライしない方がユーザー/サーバー両方に優しい)。
    """
    if isinstance(exc, _TRANSIENT_EXCEPTIONS):
        return "transient"
    if isinstance(exc, _PERMANENT_EXCEPTIONS):
        return "permanent"
    if isinstance(exc, SMTPResponseException):
        # 4xx は transient (サーバー一時エラー), 5xx は permanent
        code = getattr(exc, "code", 0) or 0
        return "transient" if 400 <= code < 500 else "permanent"
    if isinstance(exc, SMTPException):
        return "permanent"
    return "permanent"


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
        start_tls: bool | None,
        timeout: int | float,
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
            # Intentionally broad: SMTP/network failures become SendResult
            # instead of propagating. Classification distinguishes retriable
            # from permanent failures so Phase 2d retry worker has enough
            # information to decide.
            return SendResult(
                ok=False,
                error=f"{type(exc).__name__}: {exc}",
                failure_kind=_classify(exc),
            )
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
