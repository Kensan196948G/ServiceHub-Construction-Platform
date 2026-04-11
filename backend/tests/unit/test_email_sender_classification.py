"""EmailSender の失敗分類 (transient / permanent) テスト (Codex review fix)"""

import pytest
from aiosmtplib.errors import (
    SMTPAuthenticationError,
    SMTPConnectError,
    SMTPConnectTimeoutError,
    SMTPRecipientsRefused,
    SMTPResponseException,
    SMTPServerDisconnected,
    SMTPTimeoutError,
)

from app.core.config import get_settings
from app.services.notification_senders.email_sender import (
    EmailSender,
    _classify,
)


class _RaisingSend:
    def __init__(self, exc: BaseException) -> None:
        self.exc = exc

    async def __call__(self, *args, **kwargs) -> None:
        raise self.exc


@pytest.mark.parametrize(
    "exc",
    [
        SMTPConnectError("cant connect"),
        SMTPConnectTimeoutError("timed out"),
        SMTPServerDisconnected("server dropped"),
        SMTPTimeoutError("read timeout"),
        ConnectionError("boom"),
        TimeoutError("slow"),
        OSError(99, "network unreachable"),  # socket.gaierror parent
    ],
)
def test_classify_transient_exceptions(exc):
    assert _classify(exc) == "transient"


@pytest.mark.parametrize(
    "exc",
    [
        SMTPAuthenticationError(535, "auth failed"),
        SMTPRecipientsRefused([]),
    ],
)
def test_classify_permanent_exceptions(exc):
    assert _classify(exc) == "permanent"


def test_classify_smtp_response_4xx_is_transient():
    exc = SMTPResponseException(451, "try again later")
    assert _classify(exc) == "transient"


def test_classify_smtp_response_5xx_is_permanent():
    exc = SMTPResponseException(550, "mailbox unavailable")
    assert _classify(exc) == "permanent"


def test_classify_unknown_exception_defaults_to_permanent():
    """未知例外は安全側 (リトライしない) に倒す。"""

    class _UnknownError(Exception):
        pass

    assert _classify(_UnknownError("mystery")) == "permanent"


@pytest.mark.asyncio
async def test_send_populates_failure_kind_transient():
    sender = EmailSender(
        settings=get_settings(),
        smtp_send=_RaisingSend(SMTPConnectTimeoutError("cant reach")),
    )
    result = await sender.send(to="u@example.com", subject="s", body_text="b")
    assert result.ok is False
    assert result.failure_kind == "transient"


@pytest.mark.asyncio
async def test_send_populates_failure_kind_permanent():
    sender = EmailSender(
        settings=get_settings(),
        smtp_send=_RaisingSend(SMTPAuthenticationError(535, "auth")),
    )
    result = await sender.send(to="u@example.com", subject="s", body_text="b")
    assert result.ok is False
    assert result.failure_kind == "permanent"


@pytest.mark.asyncio
async def test_send_success_has_no_failure_kind():
    class _OkSend:
        async def __call__(self, *args, **kwargs) -> None:
            return None

    sender = EmailSender(settings=get_settings(), smtp_send=_OkSend())
    result = await sender.send(to="u@example.com", subject="s", body_text="b")
    assert result.ok is True
    assert result.failure_kind is None
    assert result.error is None
