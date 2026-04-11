"""Slack 送信チャンネル実装 (httpx POST Incoming Webhook)

設計書 §9.3 で採択した Incoming Webhook 方式を実装する。
- Webhook URL はユーザー設定 (notification_preferences.slack_webhook_url) から
- 送信ペイロードは `{"text": "..."}` のシンプルな形 (将来 blocks 対応可)
- 戻り値契約は EmailSender と同じ SendResult(ok, error, failure_kind)
- 例外は一律 transient/permanent 分類して SendResult に吸収 (fire-and-forget)

失敗分類:
- 4xx (bad webhook, invalid payload): permanent
- 5xx (Slack server error): transient
- Network/Timeout: transient
- 未知例外: 安全側で permanent
"""

from typing import Protocol

import httpx

from app.core.config import Settings
from app.services.notification_senders.email_sender import FailureKind, SendResult


class _HttpxClient(Protocol):
    """httpx.AsyncClient.post 互換の shape (テスト差し替え用)。"""

    async def __call__(
        self,
        url: str,
        *,
        json: dict,
        timeout: float,
    ) -> httpx.Response: ...


class SlackSender:
    """Slack Incoming Webhook 送信チャンネル。"""

    def __init__(
        self,
        settings: Settings,
        http_post: _HttpxClient | None = None,
    ) -> None:
        self.settings = settings
        # Dependency injection point: tests pass a fake coroutine here.
        self._http_post = http_post
        # httpx timeout: SMTP と同じ値を流用
        self._timeout: float = float(settings.SMTP_TIMEOUT_SECONDS)

    async def send(
        self,
        *,
        webhook_url: str,
        text: str,
    ) -> SendResult:
        """Slack Incoming Webhook に text メッセージを POST する。"""
        if not webhook_url:
            return SendResult(
                ok=False,
                error="SlackSender: webhook_url is empty",
                failure_kind="permanent",
            )

        payload = {"text": text}
        try:
            response = await self._post(webhook_url, payload)
        except httpx.TimeoutException as exc:
            return SendResult(
                ok=False,
                error=f"TimeoutException: {exc}",
                failure_kind="transient",
            )
        except httpx.NetworkError as exc:
            return SendResult(
                ok=False,
                error=f"NetworkError: {type(exc).__name__}: {exc}",
                failure_kind="transient",
            )
        except Exception as exc:  # noqa: BLE001
            # fire-and-forget 契約: 未知例外もここで吸収、permanent 扱い
            return SendResult(
                ok=False,
                error=f"{type(exc).__name__}: {exc}",
                failure_kind="permanent",
            )

        return self._interpret_response(response)

    async def _post(self, webhook_url: str, payload: dict) -> httpx.Response:
        if self._http_post is not None:
            return await self._http_post(
                webhook_url, json=payload, timeout=self._timeout
            )
        async with httpx.AsyncClient() as client:
            return await client.post(webhook_url, json=payload, timeout=self._timeout)

    @staticmethod
    def _interpret_response(response: httpx.Response) -> SendResult:
        status = response.status_code
        if 200 <= status < 300:
            return SendResult(ok=True)

        kind: FailureKind = "transient" if 500 <= status < 600 else "permanent"
        # Slack のエラー本文 (例: "invalid_payload") は error_detail に残すが
        # 過剰に長くしない。body は repository サニタイザで最終 redact される。
        body_snippet = (response.text or "")[:200]
        return SendResult(
            ok=False,
            error=f"SlackHttpError: status={status} body={body_snippet}",
            failure_kind=kind,
        )
