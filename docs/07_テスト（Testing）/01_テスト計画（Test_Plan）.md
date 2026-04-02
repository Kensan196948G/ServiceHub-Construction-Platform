# テスト計画書

## 概要

ServiceHub Construction Platformのテスト戦略と実施計画。

## テストレベル

### 1. ユニットテスト（Unit Tests）
- **対象**: schemas, security, rbac, pagination, exceptions
- **ツール**: pytest + pytest-asyncio
- **場所**: `backend/tests/test_*.py`
- **実行**: `pytest backend/tests/ -v --cov=app`

### 2. 統合テスト（Integration Tests）
- **対象**: 全APIエンドポイント（E2Eシナリオ）
- **ツール**: pytest + httpx AsyncClient + SQLite(aiosqlite)
- **場所**: `backend/tests/integration/`
- **実行**: `pytest backend/tests/integration/ -v`

### 3. 性能テスト（Performance Tests）
- **対象**: 主要エンドポイント
- **ツール**: Locust
- **場所**: `backend/tests/performance/locustfile.py`
- **実行**: `locust -f locustfile.py --host=http://localhost:8000`
- **目標**:
  - レスポンス95th: < 500ms
  - スループット: > 100 RPS（同時50ユーザー）
  - エラー率: < 1%

### 4. セキュリティテスト（Security Tests）
- **ツール**: bandit（静的解析）
- **実行**: `.github/workflows/security-scan.yml`（週次）
- **確認項目**: SQLインジェクション, JWT弱点, ハードコード秘密鍵

## テストカバレッジ目標

| フェーズ | カバレッジ目標 |
|---------|------------|
| Phase5（現在） | 70%以上 |
| リリース時 | 80%以上 |

## CI/CDパイプライン

```
push → ruff lint → pytest（カバレッジ） → mypy → (weekly) bandit
```
