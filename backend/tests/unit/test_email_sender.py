"""EmailSender のユニットテスト

aiosmtplib.send の依存注入ポイントを使い、実 SMTP サーバーに接続せずに
「正常送信」「例外伝播の抑制」「メッセージ組み立て」を検証する。
"""

from email.message import EmailMessage

import pytest

from app.core.config import get_settings
from app.services.notification_senders.email_sender import EmailSender, SendResult


class _FakeSmtpSend:
    """aiosmtplib.send 互換のスパイ。呼び出し引数を記録する。"""

    def __init__(self, raise_exc: Exception | None = None) -> None:
        self.raise_exc = raise_exc
        self.calls: list[dict] = []

    async def __call__(self, message: EmailMessage, **kwargs) -> None:
        self.calls.append({"message": message, **kwargs})
        if self.raise_exc is not None:
            raise self.raise_exc


@pytest.mark.asyncio
async def test_send_success_returns_ok_result():
    spy = _FakeSmtpSend()
    sender = EmailSender(settings=get_settings(), smtp_send=spy)

    result = await sender.send(
        to="user@example.com",
        subject="Hello",
        body_text="This is the body.",
    )

    assert result == SendResult(ok=True)
    assert len(spy.calls) == 1
    call = spy.calls[0]
    assert call["hostname"] == get_settings().SMTP_HOST
    assert call["port"] == get_settings().SMTP_PORT


@pytest.mark.asyncio
async def test_send_failure_is_captured_not_raised():
    """SMTP 例外は SendResult(ok=False) に変換され、呼び出し側には伝播しない。

    fire-and-forget 契約の心臓部: Dispatcher が例外で死なないことを保証する。
    """
    spy = _FakeSmtpSend(raise_exc=ConnectionRefusedError("no smtp server"))
    sender = EmailSender(settings=get_settings(), smtp_send=spy)

    result = await sender.send(
        to="user@example.com",
        subject="Hello",
        body_text="body",
    )

    assert result.ok is False
    assert result.error is not None
    assert "ConnectionRefusedError" in result.error
    assert "no smtp server" in result.error


@pytest.mark.asyncio
async def test_send_builds_message_with_headers_and_body():
    spy = _FakeSmtpSend()
    settings = get_settings()
    sender = EmailSender(settings=settings, smtp_send=spy)

    await sender.send(
        to="recipient@example.com",
        subject="件名テスト",
        body_text="プレーンテキスト本文",
        body_html="<p>HTML 本文</p>",
    )

    msg = spy.calls[0]["message"]
    assert msg["To"] == "recipient@example.com"
    assert msg["Subject"] == "件名テスト"
    # From ヘッダに表示名と address が組み立てられていること
    assert settings.SMTP_FROM_ADDRESS in msg["From"]
    assert settings.SMTP_FROM_NAME in msg["From"]
    # multipart/alternative になっていること (text + html)
    assert msg.is_multipart()


@pytest.mark.asyncio
async def test_send_text_only_is_not_multipart():
    spy = _FakeSmtpSend()
    sender = EmailSender(settings=get_settings(), smtp_send=spy)

    await sender.send(
        to="recipient@example.com",
        subject="No HTML",
        body_text="just text",
    )

    msg = spy.calls[0]["message"]
    assert not msg.is_multipart()


@pytest.mark.asyncio
async def test_send_timeout_error_captured():
    """TimeoutError のような非 SMTP 例外も SendResult(ok=False) で吸収される。"""
    spy = _FakeSmtpSend(raise_exc=TimeoutError("smtp hang"))
    sender = EmailSender(settings=get_settings(), smtp_send=spy)

    result = await sender.send(
        to="user@example.com",
        subject="s",
        body_text="b",
    )

    assert result.ok is False
    assert "TimeoutError" in (result.error or "")
