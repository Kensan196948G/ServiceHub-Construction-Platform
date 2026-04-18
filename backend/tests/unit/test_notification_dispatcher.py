"""NotificationDispatcher のユニットテスト

EmailSender と TemplateRenderer を依存注入でフェイク差し替えし、
Dispatcher のオーケストレーション (事前書き込み・購読判定・成功/失敗遷移)
を検証する。SQLite インメモリ DB を使う。
"""

from dataclasses import dataclass

import pytest
from sqlalchemy import select

from app.models.notification_delivery import NotificationDelivery
from app.models.notification_preference import NotificationPreference
from app.services.notification_dispatcher import NotificationDispatcher
from app.services.notification_senders.email_sender import SendResult
from app.services.notification_templates.renderer import RenderedEmail
from tests.conftest import ADMIN_USER_ID, PM_USER_ID, VIEWER_USER_ID


class _FakeEmailSender:
    """SendResult を事前に仕込めるフェイク。"""

    def __init__(self, result: SendResult | None = None) -> None:
        self.result = result or SendResult(ok=True)
        self.sent: list[dict] = []

    async def send(
        self,
        *,
        to: str,
        subject: str,
        body_text: str,
        body_html: str | None = None,
    ) -> SendResult:
        self.sent.append(
            {
                "to": to,
                "subject": subject,
                "body_text": body_text,
                "body_html": body_html,
            }
        )
        return self.result


@dataclass
class _FakeRenderer:
    """常に固定の RenderedEmail を返すフェイク。"""

    subject: str = "Subject X"
    body_text: str = "Body text X"
    body_html: str | None = "<p>HTML X</p>"

    def render_email(self, event_key: str, context: dict) -> RenderedEmail:
        return RenderedEmail(
            subject=f"{self.subject} [{event_key}]",
            body_text=self.body_text,
            body_html=self.body_html,
        )


async def _set_pref(
    db_session_with_users,
    user_id,
    *,
    email_enabled: bool,
    event_key: str,
    subscribed_to_email: bool,
) -> None:
    pref = NotificationPreference(
        user_id=user_id,
        email_enabled=email_enabled,
        slack_enabled=False,
        events={event_key: {"email": subscribed_to_email, "slack": False}},
    )
    db_session_with_users.add(pref)
    await db_session_with_users.flush()


async def _get_deliveries(db_session_with_users) -> list[NotificationDelivery]:
    result = await db_session_with_users.execute(
        select(NotificationDelivery).order_by(NotificationDelivery.created_at)
    )
    return list(result.scalars().all())


@pytest.mark.asyncio
async def test_dispatch_sends_to_subscribed_user_success_path(db_session_with_users):
    """購読済みユーザー 1 名: delivery=SENT で完走する。"""
    await _set_pref(
        db_session_with_users,
        ADMIN_USER_ID,
        email_enabled=True,
        event_key="daily_report_submitted",
        subscribed_to_email=True,
    )
    fake_sender = _FakeEmailSender(result=SendResult(ok=True))
    dispatcher = NotificationDispatcher(
        db_session_with_users,
        email_sender=fake_sender,  # type: ignore[arg-type]
        template_renderer=_FakeRenderer(),  # type: ignore[arg-type]
    )

    deliveries = await dispatcher.dispatch(
        event_key="daily_report_submitted",
        user_ids=[ADMIN_USER_ID],
        context={"report_id": "r1"},
    )

    assert len(deliveries) == 1
    assert deliveries[0].status == "SENT"
    assert deliveries[0].sent_at is not None
    assert deliveries[0].channel == "EMAIL"
    assert deliveries[0].attempts == 1
    # EmailSender に届いた内容検証
    assert len(fake_sender.sent) == 1
    assert fake_sender.sent[0]["to"] == "admin@test.example.com"
    assert "daily_report_submitted" in fake_sender.sent[0]["subject"]


@pytest.mark.asyncio
async def test_dispatch_skips_unsubscribed_user(db_session_with_users):
    """event_prefs.email == False のユーザーには送信されない。"""
    await _set_pref(
        db_session_with_users,
        ADMIN_USER_ID,
        email_enabled=True,
        event_key="daily_report_submitted",
        subscribed_to_email=False,  # この event には購読していない
    )
    fake_sender = _FakeEmailSender()
    dispatcher = NotificationDispatcher(
        db_session_with_users,
        email_sender=fake_sender,  # type: ignore[arg-type]
        template_renderer=_FakeRenderer(),  # type: ignore[arg-type]
    )

    deliveries = await dispatcher.dispatch(
        event_key="daily_report_submitted",
        user_ids=[ADMIN_USER_ID],
        context={},
    )

    assert deliveries == []
    assert fake_sender.sent == []
    # 事前書き込みも発生していない (購読判定は書き込み前に行うため)
    assert await _get_deliveries(db_session_with_users) == []


@pytest.mark.asyncio
async def test_dispatch_skips_email_globally_disabled(db_session_with_users):
    """email_enabled=False のユーザーはイベント購読に関わらず送信されない。"""
    await _set_pref(
        db_session_with_users,
        ADMIN_USER_ID,
        email_enabled=False,
        event_key="daily_report_submitted",
        subscribed_to_email=True,
    )
    fake_sender = _FakeEmailSender()
    dispatcher = NotificationDispatcher(
        db_session_with_users,
        email_sender=fake_sender,  # type: ignore[arg-type]
        template_renderer=_FakeRenderer(),  # type: ignore[arg-type]
    )

    deliveries = await dispatcher.dispatch(
        event_key="daily_report_submitted",
        user_ids=[ADMIN_USER_ID],
        context={},
    )

    assert deliveries == []
    assert fake_sender.sent == []


@pytest.mark.asyncio
async def test_dispatch_skips_user_without_preference_row(db_session_with_users):
    """preferences レコードが無いユーザーは送信対象外。"""
    fake_sender = _FakeEmailSender()
    dispatcher = NotificationDispatcher(
        db_session_with_users,
        email_sender=fake_sender,  # type: ignore[arg-type]
        template_renderer=_FakeRenderer(),  # type: ignore[arg-type]
    )

    deliveries = await dispatcher.dispatch(
        event_key="daily_report_submitted",
        user_ids=[ADMIN_USER_ID],
        context={},
    )

    assert deliveries == []
    assert fake_sender.sent == []


@pytest.mark.asyncio
async def test_dispatch_marks_failed_on_send_error(db_session_with_users):
    """Email 送信失敗時は delivery=FAILED, error_detail が記録される。"""
    await _set_pref(
        db_session_with_users,
        ADMIN_USER_ID,
        email_enabled=True,
        event_key="daily_report_submitted",
        subscribed_to_email=True,
    )
    fake_sender = _FakeEmailSender(
        result=SendResult(ok=False, error="ConnectionRefusedError: boom")
    )
    dispatcher = NotificationDispatcher(
        db_session_with_users,
        email_sender=fake_sender,  # type: ignore[arg-type]
        template_renderer=_FakeRenderer(),  # type: ignore[arg-type]
    )

    deliveries = await dispatcher.dispatch(
        event_key="daily_report_submitted",
        user_ids=[ADMIN_USER_ID],
        context={},
    )

    assert len(deliveries) == 1
    assert deliveries[0].status == "FAILED"
    assert deliveries[0].sent_at is None
    assert deliveries[0].error_detail is not None
    assert "ConnectionRefusedError" in deliveries[0].error_detail
    assert deliveries[0].attempts == 1


@pytest.mark.asyncio
async def test_dispatch_writes_pending_row_before_send(db_session_with_users):
    """事前書き込み: Sender 呼出時点で delivery 行が存在している。"""
    await _set_pref(
        db_session_with_users,
        ADMIN_USER_ID,
        email_enabled=True,
        event_key="daily_report_submitted",
        subscribed_to_email=True,
    )

    observed_row_count: list[int] = []

    class _ObservingSender:
        async def send(self, **kwargs) -> SendResult:
            # Sender に入った瞬間の delivery 行数を記録
            result = await db_session_with_users.execute(select(NotificationDelivery))
            observed_row_count.append(len(list(result.scalars().all())))
            return SendResult(ok=True)

    dispatcher = NotificationDispatcher(
        db_session_with_users,
        email_sender=_ObservingSender(),  # type: ignore[arg-type]
        template_renderer=_FakeRenderer(),  # type: ignore[arg-type]
    )

    await dispatcher.dispatch(
        event_key="daily_report_submitted",
        user_ids=[ADMIN_USER_ID],
        context={},
    )

    # 送信前に 1 行書き込まれていたことを確認 (事前書き込み契約)
    assert observed_row_count == [1]


@pytest.mark.asyncio
async def test_dispatch_multiple_users_mixed_subscription(db_session_with_users):
    """複数ユーザー: 購読/非購読/未設定の混在で適切にフィルタされる。"""
    await _set_pref(
        db_session_with_users,
        ADMIN_USER_ID,
        email_enabled=True,
        event_key="daily_report_submitted",
        subscribed_to_email=True,
    )
    await _set_pref(
        db_session_with_users,
        VIEWER_USER_ID,
        email_enabled=True,
        event_key="daily_report_submitted",
        subscribed_to_email=False,  # 非購読
    )
    # PM_USER_ID は preferences レコード未作成

    fake_sender = _FakeEmailSender()
    dispatcher = NotificationDispatcher(
        db_session_with_users,
        email_sender=fake_sender,  # type: ignore[arg-type]
        template_renderer=_FakeRenderer(),  # type: ignore[arg-type]
    )

    deliveries = await dispatcher.dispatch(
        event_key="daily_report_submitted",
        user_ids=[ADMIN_USER_ID, VIEWER_USER_ID, PM_USER_ID],
        context={},
    )

    # ADMIN のみに送信される
    assert len(deliveries) == 1
    assert deliveries[0].user_id == ADMIN_USER_ID
    assert len(fake_sender.sent) == 1


@pytest.mark.asyncio
async def test_dispatch_empty_user_list(db_session_with_users):
    dispatcher = NotificationDispatcher(
        db_session_with_users,
        email_sender=_FakeEmailSender(),  # type: ignore[arg-type]
        template_renderer=_FakeRenderer(),  # type: ignore[arg-type]
    )
    result = await dispatcher.dispatch(event_key="x", user_ids=[], context={})
    assert result == []


@pytest.mark.asyncio
async def test_send_ping_bypasses_subscription(db_session_with_users):
    """疎通テスト: preferences 未設定でも強制送信される。"""
    fake_sender = _FakeEmailSender()
    dispatcher = NotificationDispatcher(
        db_session_with_users,
        email_sender=fake_sender,  # type: ignore[arg-type]
        template_renderer=_FakeRenderer(),  # type: ignore[arg-type]
    )

    # User モデルを実 DB から取得
    from sqlalchemy import select as _select

    from app.models.user import User

    user = (
        await db_session_with_users.execute(
            _select(User).where(User.id == ADMIN_USER_ID)
        )
    ).scalar_one()

    # Phase 2b: send_ping はデフォルト email チャンネルのみ送信し
    # list[NotificationDelivery] を返す。
    deliveries = await dispatcher.send_ping(user=user)

    assert len(deliveries) == 1
    assert deliveries[0].status == "SENT"
    assert deliveries[0].event_key == "ping"
    assert deliveries[0].channel == "EMAIL"
    assert len(fake_sender.sent) == 1
    assert fake_sender.sent[0]["to"] == "admin@test.example.com"


@pytest.mark.asyncio
async def test_body_preview_is_truncated_to_500_chars(db_session_with_users):
    await _set_pref(
        db_session_with_users,
        ADMIN_USER_ID,
        email_enabled=True,
        event_key="x",
        subscribed_to_email=True,
    )
    long_body = "A" * 1000
    fake_sender = _FakeEmailSender()
    dispatcher = NotificationDispatcher(
        db_session_with_users,
        email_sender=fake_sender,  # type: ignore[arg-type]
        template_renderer=_FakeRenderer(body_text=long_body),  # type: ignore[arg-type]
    )

    deliveries = await dispatcher.dispatch(
        event_key="x",
        user_ids=[ADMIN_USER_ID],
        context={},
    )

    assert deliveries[0].body_preview is not None
    assert len(deliveries[0].body_preview) == 500


def test_should_send_slack_returns_false_without_webhook_url():
    """_should_send: slack_enabled=True でも webhook_url 未設定なら False。

    Codex review Fix #2: _should_send() が唯一の判定ゲートウェイになるよう
    webhook_url チェックをメソッド内に包含させた。
    """
    from dataclasses import dataclass

    @dataclass
    class _FakePref:
        email_enabled: bool = True
        slack_enabled: bool = True
        slack_webhook_url: str | None = None
        events: dict = None  # type: ignore[assignment]

        def __post_init__(self) -> None:
            if self.events is None:
                self.events = {"evt": {"email": True, "slack": True}}

    pref = _FakePref(slack_webhook_url=None)
    assert NotificationDispatcher._should_send(pref, "evt", "slack") is False


def test_should_send_slack_returns_true_with_webhook_url():
    """_should_send: slack_enabled=True + webhook_url 設定済みなら True。"""
    from dataclasses import dataclass

    @dataclass
    class _FakePref:
        email_enabled: bool = True
        slack_enabled: bool = True
        slack_webhook_url: str | None = "https://hooks.slack.example.com/xxx"
        events: dict = None  # type: ignore[assignment]

        def __post_init__(self) -> None:
            if self.events is None:
                self.events = {"evt": {"email": True, "slack": True}}

    pref = _FakePref()
    assert NotificationDispatcher._should_send(pref, "evt", "slack") is True


# ── SSE push integration (Phase 4b) ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_dispatch_pushes_sse_event(db_session_with_users):
    """dispatch() は購読設定にかかわらず対象ユーザーへ SSE push する。"""
    from unittest.mock import AsyncMock, patch

    await _set_pref(
        db_session_with_users,
        ADMIN_USER_ID,
        email_enabled=True,
        event_key="daily_report_submitted",
        subscribed_to_email=True,
    )
    fake_sender = _FakeEmailSender(result=SendResult(ok=True))
    dispatcher = NotificationDispatcher(
        db_session_with_users,
        email_sender=fake_sender,  # type: ignore[arg-type]
        template_renderer=_FakeRenderer(),  # type: ignore[arg-type]
    )

    mock_push = AsyncMock()
    with patch(
        "app.services.notification_dispatcher.sse_manager.push",
        new=mock_push,
    ):
        await dispatcher.dispatch(
            event_key="daily_report_submitted",
            user_ids=[ADMIN_USER_ID],
            context={"title": "日報提出", "message": "テスト本文"},
        )

    mock_push.assert_awaited_once()
    call_args = mock_push.call_args
    pushed_user_id, event = call_args[0]
    assert pushed_user_id == ADMIN_USER_ID
    assert event["type"] == "notification"
    assert event["event_key"] == "daily_report_submitted"
    assert event["title"] == "日報提出"


@pytest.mark.asyncio
async def test_dispatch_pushes_sse_even_without_email_subscription(db_session_with_users):
    """メール購読なしでも SSE push は発生する。"""
    from unittest.mock import AsyncMock, patch

    await _set_pref(
        db_session_with_users,
        PM_USER_ID,
        email_enabled=False,
        event_key="project_status_changed",
        subscribed_to_email=False,
    )
    fake_sender = _FakeEmailSender()
    dispatcher = NotificationDispatcher(
        db_session_with_users,
        email_sender=fake_sender,  # type: ignore[arg-type]
        template_renderer=_FakeRenderer(),  # type: ignore[arg-type]
    )

    mock_push = AsyncMock()
    with patch(
        "app.services.notification_dispatcher.sse_manager.push",
        new=mock_push,
    ):
        await dispatcher.dispatch(
            event_key="project_status_changed",
            user_ids=[PM_USER_ID],
            context={},
        )

    # Email was not sent but SSE push should still be called
    assert len(fake_sender.sent) == 0
    mock_push.assert_awaited_once()
