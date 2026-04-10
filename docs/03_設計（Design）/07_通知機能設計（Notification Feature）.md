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
