"""TemplateRenderer ユニットテスト (Phase 5c)

`app.services.notification_templates.renderer` の挙動を検証する。
- 既定テンプレートディレクトリでの render_email / render_slack
- HTML テンプレ欠落時の _render_optional フォールバック
- 必須テンプレ欠落時の TemplateNotFoundError
- StrictUndefined による未定義変数エラー
- カスタム template_dir の注入
"""

from pathlib import Path

import pytest
from jinja2 import UndefinedError

from app.services.notification_templates.renderer import (
    RenderedEmail,
    RenderedSlack,
    TemplateNotFoundError,
    TemplateRenderer,
)


# ── Default template dir (ping event_key) ────────────────────────────────────


def _ping_context() -> dict:
    return {
        "user_name": "山田太郎",
        "sent_at": "2026-04-18 10:00:00",
        "app_url": "https://example.com",
    }


def test_render_email_ping_returns_all_fields():
    """ping テンプレは subject / txt / html すべて揃っているため全フィールドが埋まる。"""
    renderer = TemplateRenderer()
    result = renderer.render_email("ping", _ping_context())
    assert isinstance(result, RenderedEmail)
    assert "山田太郎" in result.subject
    assert "疎通テスト" in result.subject
    assert "山田太郎" in result.body_text
    assert "2026-04-18 10:00:00" in result.body_text
    assert result.body_html is not None
    assert "山田太郎" in result.body_html
    assert "https://example.com" in result.body_html


def test_render_email_strips_subject():
    """subject は末尾改行を strip して返す (dataclass frozen + .strip() 動作)。"""
    renderer = TemplateRenderer()
    result = renderer.render_email("ping", _ping_context())
    assert result.subject == result.subject.strip()
    assert not result.subject.endswith("\n")


def test_render_email_missing_event_raises():
    """存在しない event_key を渡すと TemplateNotFoundError が LookupError サブクラスとして上がる。"""
    renderer = TemplateRenderer()
    with pytest.raises(TemplateNotFoundError) as exc:
        renderer.render_email("nonexistent_event", _ping_context())
    assert "nonexistent_event" in str(exc.value)
    assert isinstance(exc.value, LookupError)


def test_render_email_strict_undefined_raises():
    """StrictUndefined 設定のため、context に user_name が欠けると UndefinedError。"""
    renderer = TemplateRenderer()
    with pytest.raises(UndefinedError):
        renderer.render_email("ping", {"sent_at": "now", "app_url": "x"})


def test_render_slack_ping_returns_text():
    """Slack テンプレは text 1 フィールドのみ、strip 済み。"""
    renderer = TemplateRenderer()
    result = renderer.render_slack("ping", _ping_context())
    assert isinstance(result, RenderedSlack)
    assert "山田太郎" in result.text
    assert ":bell:" in result.text
    assert result.text == result.text.strip()


def test_render_slack_missing_event_raises():
    """slack 側に存在しない event_key も TemplateNotFoundError を返す。"""
    renderer = TemplateRenderer()
    with pytest.raises(TemplateNotFoundError):
        renderer.render_slack("nonexistent_event", _ping_context())


# ── Custom template dir (tmp_path) ───────────────────────────────────────────


def _write(base: Path, rel: str, content: str) -> None:
    target = base / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def test_render_email_without_html_returns_none(tmp_path: Path):
    """HTML テンプレを用意しない場合、_render_optional が None を返す。"""
    _write(tmp_path, "email/evt.subject.j2", "件名: {{ x }}\n")
    _write(tmp_path, "email/evt.txt.j2", "本文 {{ x }}\n")
    # email/evt.html.j2 は意図的に作らない

    renderer = TemplateRenderer(template_dir=tmp_path)
    result = renderer.render_email("evt", {"x": "hello"})

    assert result.subject == "件名: hello"
    # trim_blocks=True のため末尾改行は除去される
    assert result.body_text == "本文 hello"
    assert result.body_html is None


def test_render_email_missing_required_txt_raises(tmp_path: Path):
    """subject はあるが txt が無い場合、_render_required が TemplateNotFoundError。"""
    _write(tmp_path, "email/evt.subject.j2", "件名")
    # email/evt.txt.j2 を欠落させる

    renderer = TemplateRenderer(template_dir=tmp_path)
    with pytest.raises(TemplateNotFoundError) as exc:
        renderer.render_email("evt", {})
    assert "evt.txt.j2" in str(exc.value)


def test_custom_template_dir_slack(tmp_path: Path):
    """カスタム template_dir 経由で slack テンプレも読める。"""
    _write(tmp_path, "slack/evt.txt.j2", "  hello {{ name }}  \n")
    renderer = TemplateRenderer(template_dir=tmp_path)
    result = renderer.render_slack("evt", {"name": "world"})
    assert result.text == "hello world"
