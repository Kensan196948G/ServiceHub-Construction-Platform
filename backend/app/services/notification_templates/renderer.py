"""Jinja2 テンプレートレンダラ

ディレクトリ構造:

    notification_templates/
    ├── email/
    │   ├── <event_key>.subject.j2   # メール件名 (1行)
    │   ├── <event_key>.txt.j2       # プレーンテキスト本文
    │   └── <event_key>.html.j2      # HTML 本文 (オプション)
    └── slack/                       # Phase 2b で追加
        └── <event_key>.txt.j2

event_key はドメインイベント識別子 (`daily_report_submitted` 等)。
Phase 2a では `ping` イベント (疎通テスト用) のみ同梱する。
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from jinja2 import (
    Environment,
    FileSystemLoader,
    StrictUndefined,
    TemplateNotFound,
    select_autoescape,
)

_TEMPLATE_DIR = Path(__file__).parent


class TemplateNotFoundError(LookupError):
    """指定された event_key / channel のテンプレートが存在しない。"""


@dataclass(frozen=True)
class RenderedEmail:
    subject: str
    body_text: str
    body_html: str | None


@dataclass(frozen=True)
class RenderedSlack:
    """Slack チャンネル向けレンダー結果。

    Phase 2b は `text` のみ。将来 blocks (rich formatting) が必要になったら
    フィールドを追加する。
    """

    text: str


class TemplateRenderer:
    def __init__(self, template_dir: Path | None = None) -> None:
        self._env = Environment(
            loader=FileSystemLoader(template_dir or _TEMPLATE_DIR),
            autoescape=select_autoescape(["html", "htm"]),
            undefined=StrictUndefined,
            trim_blocks=True,
            lstrip_blocks=True,
        )

    def render_email(self, event_key: str, context: dict[str, Any]) -> RenderedEmail:
        subject_raw = self._render_required(f"email/{event_key}.subject.j2", context)
        body_text = self._render_required(f"email/{event_key}.txt.j2", context)
        body_html = self._render_optional(f"email/{event_key}.html.j2", context)
        return RenderedEmail(
            subject=subject_raw.strip(),
            body_text=body_text,
            body_html=body_html,
        )

    def render_slack(self, event_key: str, context: dict[str, Any]) -> RenderedSlack:
        """Slack チャンネル向けテンプレをレンダリングする。

        `slack/<event_key>.txt.j2` 1 ファイル構成。将来 rich blocks が必要に
        なったら `slack/<event_key>.blocks.j2` を追加し RenderedSlack を拡張する。
        """
        text = self._render_required(f"slack/{event_key}.txt.j2", context)
        return RenderedSlack(text=text.strip())

    def _render_required(self, template_name: str, context: dict[str, Any]) -> str:
        try:
            template = self._env.get_template(template_name)
        except TemplateNotFound as exc:
            raise TemplateNotFoundError(
                f"required template not found: {template_name}"
            ) from exc
        return template.render(**context)

    def _render_optional(
        self, template_name: str, context: dict[str, Any]
    ) -> str | None:
        try:
            template = self._env.get_template(template_name)
        except TemplateNotFound:
            return None
        return template.render(**context)
