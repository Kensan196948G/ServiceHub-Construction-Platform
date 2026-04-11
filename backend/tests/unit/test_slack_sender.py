"""SlackSender のユニットテスト

httpx.AsyncClient を差し替えずに `_http_post` 依存注入で完全フェイク化する。
"""

from dataclasses import dataclass

import httpx
import pytest

from app.core.config import get_settings
from app.services.notification_senders.slack_sender import SlackSender


@dataclass
class _FakeResponse:
    status_code: int
    text: str = ""


class _FakeHttpPost:
    def __init__(
        self, response: _FakeResponse | None = None, raise_exc: Exception | None = None
    ) -> None:
        self.response = response or _FakeResponse(status_code=200)
        self.raise_exc = raise_exc
        self.calls: list[dict] = []

    async def __call__(self, url: str, *, json: dict, timeout: float) -> _FakeResponse:
        self.calls.append({"url": url, "json": json, "timeout": timeout})
        if self.raise_exc is not None:
            raise self.raise_exc
        return self.response  # type: ignore[return-value]


@pytest.mark.asyncio
async def test_send_success_returns_ok():
    fake = _FakeHttpPost(_FakeResponse(status_code=200, text="ok"))
    sender = SlackSender(settings=get_settings(), http_post=fake)  # type: ignore[arg-type]

    result = await sender.send(
        webhook_url="https://hooks.slack.example.com/services/XXX",
        text="hello",
    )

    assert result.ok is True
    assert result.error is None
    assert result.failure_kind is None
    assert len(fake.calls) == 1
    assert fake.calls[0]["json"] == {"text": "hello"}


@pytest.mark.asyncio
async def test_send_empty_webhook_url_is_permanent_failure():
    sender = SlackSender(settings=get_settings())
    result = await sender.send(webhook_url="", text="hello")
    assert result.ok is False
    assert result.failure_kind == "permanent"
    assert "webhook_url" in (result.error or "")


@pytest.mark.asyncio
async def test_send_4xx_is_permanent():
    fake = _FakeHttpPost(_FakeResponse(status_code=400, text="invalid_payload"))
    sender = SlackSender(settings=get_settings(), http_post=fake)  # type: ignore[arg-type]

    result = await sender.send(
        webhook_url="https://hooks.slack.example.com/services/XXX",
        text="bad",
    )

    assert result.ok is False
    assert result.failure_kind == "permanent"
    assert "400" in (result.error or "")
    assert "invalid_payload" in (result.error or "")


@pytest.mark.asyncio
async def test_send_5xx_is_transient():
    fake = _FakeHttpPost(_FakeResponse(status_code=503, text="slack overloaded"))
    sender = SlackSender(settings=get_settings(), http_post=fake)  # type: ignore[arg-type]

    result = await sender.send(
        webhook_url="https://hooks.slack.example.com/services/XXX",
        text="hello",
    )

    assert result.ok is False
    assert result.failure_kind == "transient"
    assert "503" in (result.error or "")


@pytest.mark.asyncio
async def test_send_timeout_is_transient():
    fake = _FakeHttpPost(raise_exc=httpx.TimeoutException("read timed out"))
    sender = SlackSender(settings=get_settings(), http_post=fake)  # type: ignore[arg-type]

    result = await sender.send(
        webhook_url="https://hooks.slack.example.com/services/XXX",
        text="hello",
    )

    assert result.ok is False
    assert result.failure_kind == "transient"
    assert "TimeoutException" in (result.error or "")


@pytest.mark.asyncio
async def test_send_network_error_is_transient():
    fake = _FakeHttpPost(raise_exc=httpx.ConnectError("dns failed"))
    sender = SlackSender(settings=get_settings(), http_post=fake)  # type: ignore[arg-type]

    result = await sender.send(
        webhook_url="https://hooks.slack.example.com/services/XXX",
        text="hello",
    )

    assert result.ok is False
    assert result.failure_kind == "transient"
    assert "NetworkError" in (result.error or "") or "ConnectError" in (
        result.error or ""
    )


@pytest.mark.asyncio
async def test_send_unknown_exception_is_permanent():
    fake = _FakeHttpPost(raise_exc=ValueError("mystery"))
    sender = SlackSender(settings=get_settings(), http_post=fake)  # type: ignore[arg-type]

    result = await sender.send(
        webhook_url="https://hooks.slack.example.com/services/XXX",
        text="hello",
    )

    assert result.ok is False
    assert result.failure_kind == "permanent"


@pytest.mark.asyncio
async def test_send_passes_timeout_from_settings():
    fake = _FakeHttpPost()
    sender = SlackSender(settings=get_settings(), http_post=fake)  # type: ignore[arg-type]

    await sender.send(
        webhook_url="https://hooks.slack.example.com/services/XXX",
        text="hello",
    )

    assert fake.calls[0]["timeout"] == float(get_settings().SMTP_TIMEOUT_SECONDS)
