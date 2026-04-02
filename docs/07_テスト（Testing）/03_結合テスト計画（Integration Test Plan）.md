# 結合テスト計画（Integration Test Plan）

## 1. 結合テスト概要

| 項目 | 内容 |
|------|------|
| 目的 | APIエンドポイントとデータベース・ストレージの結合動作確認 |
| 対象 | 全APIエンドポイント（103エンドポイント） |
| ツール | pytest + httpx + TestContainers |
| 実行タイミング | CI（毎PR）+ Staging環境（日次） |
| 合否基準 | 全テスト合格 / カバレッジ全エンドポイント100% |

---

## 2. テスト環境構成

### テストデータベース（TestContainers）

```python
# conftest.py - テスト用PostgreSQL
import pytest
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="session")
def postgres_container():
    """テスト用PostgreSQLコンテナを起動"""
    with PostgresContainer("postgres:16") as postgres:
        yield postgres

@pytest.fixture(scope="session")
async def test_db_engine(postgres_container):
    """テスト用DBエンジン（マイグレーション済み）"""
    engine = create_async_engine(postgres_container.get_connection_url())
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
```

---

## 3. テストシナリオ一覧

### 認証API結合テスト

| テストID | シナリオ | 期待結果 |
|---------|---------|---------|
| INT-AUTH-001 | 正常ログイン（ID/PW + MFA） | 200 + JWTトークン返却 |
| INT-AUTH-002 | パスワード誤りでログイン | 401エラー |
| INT-AUTH-003 | 5回失敗でアカウントロック | 423エラー |
| INT-AUTH-004 | アクセストークン更新 | 200 + 新しいトークン |
| INT-AUTH-005 | 無効なトークンでアクセス | 401エラー |
| INT-AUTH-006 | 期限切れトークンでアクセス | 401エラー |

### 工事案件API結合テスト

| テストID | シナリオ | 期待結果 |
|---------|---------|---------|
| INT-PRJ-001 | PM権限での案件作成 | 201 + 案件データ |
| INT-PRJ-002 | 作業員権限での案件作成（権限なし） | 403エラー |
| INT-PRJ-003 | 案件一覧取得（担当者フィルタ） | 200 + 担当案件のみ |
| INT-PRJ-004 | 案件進捗更新 | 200 + 更新後データ |
| INT-PRJ-005 | 存在しない案件の取得 | 404エラー |
| INT-PRJ-006 | 他担当者の案件を更新（権限なし） | 403エラー |

### 日報API結合テスト

```python
class TestReportIntegration:
    async def test_create_and_approve_report(
        self, client, worker_header, supervisor_header, test_project
    ):
        """日報作成から承認までの一連のフロー"""
        # 作業員が日報を作成
        create_resp = await client.post(
            "/api/v1/reports",
            json={
                "project_id": str(test_project.id),
                "work_date": "2026-06-10",
                "content": "1階躯体工事施工",
                "regular_hours": 8.0,
            },
            headers=worker_header,
        )
        assert create_resp.status_code == 201
        report_id = create_resp.json()["id"]
        
        # 現場監督が日報を承認
        approve_resp = await client.post(
            f"/api/v1/reports/{report_id}/approve",
            json={"comment": "確認済み"},
            headers=supervisor_header,
        )
        assert approve_resp.status_code == 200
        assert approve_resp.json()["status"] == "approved"
        
        # 工数が原価管理に自動連携されることを確認
        work_hours_resp = await client.get(
            f"/api/v1/costs/work-hours?project_id={test_project.id}",
            headers=supervisor_header,
        )
        assert any(
            h["report_id"] == report_id 
            for h in work_hours_resp.json()["items"]
        )
```

---

## 4. モジュール間結合テスト

### 日報→原価連携

```
テストシナリオ: INT-CROSS-001
目的: 日報承認時に工数データが原価管理に自動連携されること
手順:
  1. 工事案件を作成（予算登録済み）
  2. 作業員が日報を作成（8時間）
  3. 現場監督が日報を承認
  4. 原価管理の工数集計APIで工数が計上されていることを確認
期待結果: 承認後1秒以内に工数データが反映される
```

### 写真→日報添付

```
テストシナリオ: INT-CROSS-002
目的: アップロードした写真を日報に添付できること
手順:
  1. 写真をアップロード（POST /photos/upload）
  2. 日報作成時に写真IDを指定
  3. 日報詳細取得で写真が添付されていることを確認
期待結果: 日報に写真が添付され、サムネイルURLが返却される
```

---

## 5. エラーケーステスト

| カテゴリ | テスト内容 | 期待HTTP Status |
|---------|----------|---------------|
| バリデーション | 必須フィールド欠如 | 422 |
| バリデーション | データ型不正 | 422 |
| 認証 | トークンなし | 401 |
| 認可 | 権限不足 | 403 |
| 存在確認 | 存在しないID | 404 |
| 重複 | 一意制約違反 | 409 |
| サーバーエラー | DB接続失敗 | 503 |

---

## 6. 実施スケジュール

| フェーズ | 実施内容 | 期間 |
|---------|---------|------|
| Phase1完了時 | 認証・ユーザー管理API | 2026/04/28〜04/30 |
| Phase2完了時 | 案件・日報API | 2026/05/28〜05/30 |
| Phase3完了時 | 写真・安全・原価API | 2026/06/28〜06/30 |
| Phase4完了時 | ITSM・ナレッジAPI | 2026/07/29〜07/31 |
| Phase5 | 全モジュール結合 + 回帰テスト | 2026/08/01〜08/31 |
