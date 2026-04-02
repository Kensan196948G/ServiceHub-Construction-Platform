# 工事案件管理 開発設計

## 概要

工事案件管理モジュールは、建設業における工事案件のライフサイクル全体を管理するコアモジュールである。案件の作成から完了まで、担当者アサイン、進捗管理、関連資料の紐付けを一元管理する。

---

## 機能一覧

| 機能ID | 機能名 | 優先度 | 説明 |
|-------|-------|--------|------|
| PM-001 | 案件作成 | 高 | 新規工事案件の登録 |
| PM-002 | 案件一覧表示 | 高 | 案件の一覧・検索・フィルタリング |
| PM-003 | 案件詳細表示 | 高 | 案件詳細ダッシュボード |
| PM-004 | 案件更新 | 高 | 案件情報の編集・更新 |
| PM-005 | ステータス管理 | 高 | 案件ステータスの遷移管理 |
| PM-006 | 担当者アサイン | 高 | メンバーの追加・削除 |
| PM-007 | 進捗管理 | 中 | 工程進捗率の管理 |
| PM-008 | 案件削除（論理削除） | 中 | 案件のアーカイブ |
| PM-009 | 案件複製 | 低 | 既存案件をテンプレートとして複製 |
| PM-010 | 案件エクスポート | 低 | Excel/CSV形式でのエクスポート |

---

## データモデル

### projects.projects テーブル

```sql
CREATE TABLE projects.projects (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code        VARCHAR(50) UNIQUE NOT NULL,     -- 案件コード（P2026-001）
    project_name        VARCHAR(200) NOT NULL,            -- 案件名
    client_name         VARCHAR(200) NOT NULL,            -- 発注者名
    client_contact      VARCHAR(100),                     -- 発注者担当者名
    location            VARCHAR(300),                     -- 工事場所
    prefecture          VARCHAR(20),                      -- 都道府県
    zip_code            VARCHAR(10),                      -- 郵便番号
    latitude            DECIMAL(9,6),                     -- 緯度
    longitude           DECIMAL(9,6),                     -- 経度
    start_date          DATE NOT NULL,                    -- 着工予定日
    end_date            DATE,                             -- 竣工予定日
    actual_start_date   DATE,                             -- 実際の着工日
    actual_end_date     DATE,                             -- 実際の竣工日
    status              VARCHAR(50) NOT NULL DEFAULT 'planning',
    budget_amount       DECIMAL(15,2),                   -- 請負金額
    description         TEXT,                            -- 概要
    special_notes       TEXT,                            -- 特記事項
    project_manager_id  UUID REFERENCES auth.users(id),  -- 現場所長
    progress_rate       DECIMAL(5,2) DEFAULT 0.00,       -- 進捗率（%）
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          UUID REFERENCES auth.users(id),
    updated_by          UUID REFERENCES auth.users(id),
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE
);
```

### projects.project_members テーブル

```sql
CREATE TABLE projects.project_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects.projects(id),
    user_id     UUID NOT NULL REFERENCES auth.users(id),
    role        VARCHAR(50) NOT NULL,  -- project_manager, site_supervisor, field_worker
    joined_at   DATE NOT NULL DEFAULT CURRENT_DATE,
    left_at     DATE,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);
```

---

## API設計

### エンドポイント一覧

| メソッド | エンドポイント | 説明 | 権限 |
|--------|------------|------|------|
| GET | /api/v1/projects | 案件一覧取得 | 全認証ユーザー |
| POST | /api/v1/projects | 案件作成 | project_manager以上 |
| GET | /api/v1/projects/{id} | 案件詳細取得 | 全認証ユーザー |
| PUT | /api/v1/projects/{id} | 案件更新 | project_manager以上 |
| PATCH | /api/v1/projects/{id}/status | ステータス変更 | project_manager以上 |
| DELETE | /api/v1/projects/{id} | 案件削除 | company_admin以上 |
| GET | /api/v1/projects/{id}/members | メンバー一覧 | 全認証ユーザー |
| POST | /api/v1/projects/{id}/members | メンバー追加 | project_manager以上 |
| DELETE | /api/v1/projects/{id}/members/{user_id} | メンバー削除 | project_manager以上 |

### 案件作成リクエスト例

```json
{
  "project_code": "P2026-001",
  "project_name": "○○ビル新築工事",
  "client_name": "株式会社○○",
  "location": "東京都渋谷区○○1-2-3",
  "start_date": "2026-06-01",
  "end_date": "2026-12-31",
  "budget_amount": 150000000,
  "description": "地上10階建て鉄筋コンクリート造ビルの新築工事",
  "project_manager_id": "uuid-of-manager"
}
```

---

## ビジネスロジック

### ステータス遷移ルール

```python
VALID_STATUS_TRANSITIONS = {
    "planning": ["in_progress", "cancelled"],
    "in_progress": ["suspended", "completed"],
    "suspended": ["in_progress", "cancelled"],
    "completed": [],
    "cancelled": []
}

def validate_status_transition(current: str, next: str) -> bool:
    return next in VALID_STATUS_TRANSITIONS.get(current, [])
```

### 進捗率自動計算

```python
def calculate_progress_rate(project_id: UUID, db: Session) -> Decimal:
    """完了工程数 / 全工程数 × 100 で進捗率を算出"""
    total_processes = db.query(func.count(Process.id)).filter(
        Process.project_id == project_id
    ).scalar()
    completed_processes = db.query(func.count(Process.id)).filter(
        Process.project_id == project_id,
        Process.status == "completed"
    ).scalar()
    if total_processes == 0:
        return Decimal("0.00")
    return Decimal(str(completed_processes / total_processes * 100)).quantize(Decimal("0.01"))
```

---

## フロントエンド画面設計

| 画面名 | パス | 説明 |
|-------|------|------|
| 案件一覧 | /projects | カード型・テーブル型切り替え可能 |
| 案件作成 | /projects/new | フォーム入力 |
| 案件詳細 | /projects/{id} | ダッシュボード形式 |
| 案件編集 | /projects/{id}/edit | 編集フォーム |
| メンバー管理 | /projects/{id}/members | メンバー一覧・追加・削除 |

---

## テスト設計

```python
# テストケース例
def test_create_project_success():
    """正常な案件作成"""

def test_create_project_duplicate_code():
    """重複コードでの案件作成エラー"""

def test_status_transition_valid():
    """有効なステータス遷移"""

def test_status_transition_invalid():
    """無効なステータス遷移の拒否"""

def test_member_assignment():
    """メンバーアサイン"""

def test_project_search_by_status():
    """ステータスによる検索"""
```
