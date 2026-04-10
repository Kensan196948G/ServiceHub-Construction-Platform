# 通知機能設計（Notification Feature）

**作成日**: 2026-04-10
**ステータス**: Phase 1 実装中
**関連 Issue**: (TBD — 本ドキュメント作成後に起票)

## 1. 背景と目的

### 現状の課題
ServiceHub Construction Platform は工事案件 / 日報 / 安全品質 / ITSM / 変更要求など複数の業務フローを提供しているが、重要イベント発生時にユーザーへプロアクティブに通知する仕組みが存在しない。現状ではユーザーがシステムにログインしない限り新規事象を検知できず、以下のような問題がある。

- 日報が提出されても承認者が気づかず、承認フローが滞留
- 安全インシデントが発生しても現場監督者の把握が遅れる
- ITSM 変更要求の承認依頼が見逃される
- 担当案件のステータス変更がタイムリーに伝わらない

### 目的
ユーザーにとって重要なイベントが発生した際に、メール・Slack 等の外部チャンネル経由でプッシュ通知を届ける仕組みを構築する。

## 2. 段階的実装計画

本機能は影響範囲が大きいため、2 段階で実装する。**本セッションでは Phase 1 のみを完走させる**。

### Phase 1: 通知設定の管理（本 PR スコープ）

ユーザーごとの通知購読設定を管理する基盤を構築する。**実送信はまだ行わない。**

**目的**: 設定データモデルと CRUD API を確立し、将来の Phase 2 実装時の手戻りを最小化する。

**成果物**:
- `notification_preferences` テーブル
- `GET /api/v1/users/me/notification-preferences` — 現在のユーザーの設定取得
- `PATCH /api/v1/users/me/notification-preferences` — 設定更新
- 認証必須・自ユーザーのみアクセス可
- 3 層アーキテクチャ（Router → Service → Repository）に準拠
- pytest による単体・統合テスト

### Phase 2: 実送信基盤（将来セッション）

**目的**: イベント発生時に実際に通知を配信する。

**成果物**:
- ドメインイベントフック（DailyReport 提出時 / Incident 作成時 / ChangeRequest 承認依頼時など）
- Email 送信: SMTP (aiosmtplib) または SendGrid API
- Slack 送信: Incoming Webhook (httpx POST)
- 配信ログテーブル (`notification_deliveries`)
- 配信失敗のリトライ方針（ジョブキュー or 同期リトライ）
- テンプレート管理（Jinja2 or dict-based）
- フロントエンド: 設定ページに通知トグル UI 追加

## 3. Phase 1 データモデル

### notification_preferences テーブル

1 ユーザーにつき 1 レコード（user_id UNIQUE）。個別のイベント種別 × チャンネルの購読可否を JSON 形式で保持する。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PK | 主キー |
| `user_id` | UUID | FK(users.id), UNIQUE | ユーザーID |
| `email_enabled` | Boolean | NOT NULL, default=true | メール通知のマスタースイッチ |
| `slack_enabled` | Boolean | NOT NULL, default=false | Slack 通知のマスタースイッチ |
| `slack_webhook_url` | String(500) | NULL | Slack Incoming Webhook URL |
| `events` | JSON | NOT NULL, default='{}' | イベント種別ごとの購読設定 |
| `created_at` | DateTime(tz) | NOT NULL | 作成日時 |
| `updated_at` | DateTime(tz) | NOT NULL | 更新日時 |

### events JSON 構造

```json
{
  "daily_report_submitted": { "email": true, "slack": false },
  "safety_incident_created": { "email": true, "slack": true },
  "change_request_pending_approval": { "email": true, "slack": false },
  "incident_assigned": { "email": true, "slack": false },
  "project_status_changed": { "email": false, "slack": false }
}
```

### 初期サポートイベント種別

| イベントキー | 発火タイミング | 対象ユーザー |
|---|---|---|
| `daily_report_submitted` | DailyReport.status=SUBMITTED | 承認権限者 (MANAGER, ADMIN) |
| `safety_incident_created` | Incident 新規作成 | 担当案件の MANAGER |
| `change_request_pending_approval` | ChangeRequest.status=PENDING_APPROVAL | 承認者 (ADMIN) |
| `incident_assigned` | Incident.assigned_to 設定 | アサイン先ユーザー |
| `project_status_changed` | Project.status 変更 | 案件関係者 |

## 4. API 設計（Phase 1）

### GET /api/v1/users/me/notification-preferences

自ユーザーの通知設定を取得。レコードが存在しない場合はデフォルト値で自動作成して返す（upsert-on-read）。

**Response 200**:
```json
{
  "success": true,
  "data": {
    "email_enabled": true,
    "slack_enabled": false,
    "slack_webhook_url": null,
    "events": {
      "daily_report_submitted": { "email": true, "slack": false },
      "safety_incident_created": { "email": true, "slack": true },
      "change_request_pending_approval": { "email": true, "slack": false },
      "incident_assigned": { "email": true, "slack": false },
      "project_status_changed": { "email": false, "slack": false }
    }
  }
}
```

### PATCH /api/v1/users/me/notification-preferences

部分更新。送信されたフィールドのみ反映。events は完全置換（部分マージではない）で上書きする。

**Request**:
```json
{
  "email_enabled": true,
  "slack_enabled": true,
  "slack_webhook_url": "https://hooks.slack.com/services/...",
  "events": { ... }
}
```

**Response 200**: GET と同じ構造。

## 5. セキュリティ / 認可

- すべてのエンドポイントで `get_current_user` 依存が必須
- 自ユーザーの設定のみアクセス可能（他ユーザーの設定を閲覧・変更する API は提供しない）
- `slack_webhook_url` は機密情報として扱う（ログに出力しない、frontend で `type="password"` マスク推奨）
- Phase 2 で実送信を実装する際、Webhook URL は暗号化保存を検討

## 6. 非スコープ（本 PR では実装しない）

- 実際の通知送信処理（email / Slack）
- Email テンプレート
- ドメインイベントフック
- 配信ログ
- リトライ機構
- フロントエンド UI（設定ページへの統合は次 PR）
- E2E テスト（UI 未実装のため）
- プッシュ通知（WebPush / モバイル）

## 7. テスト方針（Phase 1）

| レイヤ | 対象 | 観点 |
|---|---|---|
| Repository | `get_by_user_id`, `create`, `update` | upsert 動作、UNIQUE 制約 |
| Service | `get_or_create`, `update_preferences` | デフォルト値生成、更新の排他性 |
| Router | `GET`, `PATCH` | 認証必須、自ユーザー限定、JSON バリデーション |

## 8. 決定事項

- **JSON カラム採用**: events 種別の追加削除頻度が読めないため、リレーショナル分解より JSON 保持が柔軟性が高い。検索条件は「特定ユーザーの設定取得」のみで、イベント種別での横断検索は不要。
- **upsert-on-read**: GET 時に未設定なら自動生成することで、フロントエンドが常にデフォルト値を取得でき、「レコード未作成」という 404 状態を排除する。
- **events 完全置換**: PATCH で events を送信した場合は完全置換とする。部分マージは複雑性が高く、フロントエンドが全量送信する前提で問題ない。
- **Phase 1 完了判定**: `notification_preferences` テーブル + API + フロントエンド UI + E2E テストが揃った時点で Phase 1 は完了。PR #92 (backend) + PR #93 (frontend) でマージ済み。

---

## 9. Phase 2 設計（実送信基盤）

**ステータス**: 未実装。次セッション以降で着手予定。

### 9.1 目的と受入れ条件

Phase 1 で設定されたユーザー購読に従って、ドメインイベント発生時に実際のメール・Slack 通知を配信する。

**受入れ条件**:
- 購読済みイベントが発生したとき、対応チャンネルに通知が届く
- 配信失敗時も業務ロジックをブロックしない（fire-and-forget）
- 配信ログが保存され、後から追跡可能
- 送信失敗時のリトライ機構が働く
- Phase 1 の preferences 設定のみで購読 ON/OFF が制御できる

### 9.2 アーキテクチャ選定

```
ドメインイベント発生 (DailyReport.submit, Incident.create, ...)
          │
          ▼
 NotificationDispatcher.dispatch(event, payload)
          │
          ├─ 購読ユーザー解決 (notification_preferences から)
          │
          ├─ チャンネル別送信キュー投入
          │     │
          │     ├─ EmailSender (aiosmtplib)
          │     └─ SlackSender (httpx POST webhook)
          │
          └─ notification_deliveries へログ保存
```

### 9.3 技術選定の候補と推奨

| 領域 | 候補 A | 候補 B | 推奨 |
|---|---|---|---|
| Email ライブラリ | `aiosmtplib` (非同期 SMTP) | SendGrid / Mailgun API | **aiosmtplib** (外部依存少、開発環境で Mailhog に差し替え容易) |
| Slack 送信 | Incoming Webhook (httpx POST) | Slack SDK (async) | **Incoming Webhook** (シンプル、ユーザー設定済 URL を使うだけ) |
| 非同期実行 | FastAPI `BackgroundTasks` | Celery / RQ + Redis | **BackgroundTasks** (Phase 2 は軽量運用、Celery は Phase 3 以降で検討) |
| テンプレート | Jinja2 | f-string ベタ書き | **Jinja2** (将来的な多言語対応・HTML メール対応のため) |
| リトライ | 同期 3 回リトライ | 専用ジョブキュー | **同期 3 回** (Phase 2 スコープに収めるため) |

### 9.4 Phase 2 データモデル

#### notification_deliveries テーブル（新規）

| カラム | 型 | 説明 |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID (FK) | 受信者 |
| `event_key` | String(100) | イベント種別 (`daily_report_submitted` 等) |
| `channel` | String(20) | `EMAIL` / `SLACK` |
| `status` | String(20) | `PENDING` / `SENT` / `FAILED` / `RETRY` |
| `subject` | String(300) | メール件名（Slack は null） |
| `body_preview` | Text | 送信本文の先頭 500 文字（全文ログは PII リスクで保存しない） |
| `error_detail` | Text | 失敗時のエラー内容 |
| `attempts` | Integer | 試行回数 |
| `sent_at` | DateTime | 送信成功時刻 |
| `created_at` | DateTime | |

**インデックス**: `(user_id, event_key, created_at)`、`(status, created_at)` (未送信検索用)

### 9.5 Phase 2 エンドポイント

| メソッド | パス | 目的 |
|---|---|---|
| `GET` | `/api/v1/users/me/notification-deliveries` | 自分の配信履歴取得 (ページネーション) |
| `GET` | `/api/v1/notification-deliveries` | ADMIN 専用全体ログ |
| `POST` | `/api/v1/notifications/test` | 設定した Email / Slack に疎通テスト送信 (開発・本番で有用) |

### 9.6 ドメインイベントフック統合点

**初期サポートイベント** (Phase 1 の events キーと対応):

| イベントキー | 発火点 | dispatch 引数 |
|---|---|---|
| `daily_report_submitted` | `DailyReportService.submit()` の最後 | report_id, project_id |
| `safety_incident_created` | `IncidentService.create()` 直後 | incident_id |
| `change_request_pending_approval` | `ChangeRequestService.submit_for_approval()` | cr_id |
| `incident_assigned` | `IncidentService.assign()` 直後 | incident_id, assignee_id |
| `project_status_changed` | `ProjectService.update_status()` 変更時 | project_id, old, new |

### 9.7 テンプレート設計

`backend/app/services/notification_templates/` に Jinja2 テンプレートを配置:

```
notification_templates/
├── email/
│   ├── daily_report_submitted.html.j2
│   ├── daily_report_submitted.subject.j2
│   ├── safety_incident_created.html.j2
│   └── ...
└── slack/
    ├── daily_report_submitted.j2       # Slack message text
    └── ...
```

### 9.8 セキュリティ / プライバシー

- Webhook URL は Phase 1 では平文保存。Phase 2 では **暗号化 at rest** を検討（`cryptography.fernet` + KEK）
- 配信ログに PII を残しすぎない（body_preview は 500 文字まで）
- 送信失敗時のスタックトレースは `error_detail` に保存するが、ユーザーの個人情報が含まれないようサニタイズ
- ADMIN ログ閲覧時の監査ログ (`audit_logs`) への記録

### 9.9 段階的リリース方針

Phase 2 はさらに以下に細分化:

| サブフェーズ | 内容 | 見積 |
|---|---|---|
| **2a** | `NotificationDispatcher` + `notification_deliveries` + Email 送信 (MVP) | 1 セッション |
| **2b** | Slack 送信 + 設定ページから疎通テストボタン | 1 セッション |
| **2c** | ドメインイベントフック統合 (5 イベント種別) + E2E テスト | 1 セッション |
| **2d** | リトライ機構 + 監査ログ統合 | 0.5 セッション |

**2a, 2b はバックエンド中心で独立してマージ可**。2c 以降で既存業務サービスを触るため慎重に進める。

### 9.10 Phase 2 の非スコープ（Phase 3 以降）

- WebPush / モバイルプッシュ通知
- SMS 通知
- Slack ボット双方向会話（Webhook 単方向のみ）
- テンプレートの DB 管理（ファイルベースで固定）
- Celery 等の専用ワーカー（BackgroundTasks で足りる想定）
- 配信のスロットリング / レートリミット
- ユーザー間通知（例: メンション）

