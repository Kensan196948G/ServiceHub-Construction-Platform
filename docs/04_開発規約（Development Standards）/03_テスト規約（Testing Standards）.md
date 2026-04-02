# テスト規約

## テスト方針

ServiceHub Construction Platform では、テストを開発プロセスの重要な一部として位置づける。TDD（テスト駆動開発）を推奨し、高品質なコードを維持する。

---

## テストレベルと目標

| テストレベル | ツール | カバレッジ目標 | 実行タイミング |
|-----------|-------|------------|------------|
| 単体テスト | pytest（BE）/ Jest（FE） | ≥80% | コミット時 |
| 統合テスト | pytest + httpx | ≥70% | PR時 |
| E2Eテスト | Playwright | 主要シナリオ100% | マージ時 |
| 性能テスト | k6 / Locust | - | リリース前 |

---

## バックエンドテスト規約（pytest）

### ディレクトリ構造

```
backend/
├── app/
│   └── modules/
│       └── projects/
│           └── service.py
└── tests/
    ├── conftest.py           # フィクスチャ定義
    ├── unit/
    │   └── modules/
    │       └── projects/
    │           └── test_project_service.py
    └── integration/
        └── api/
            └── v1/
                └── test_projects_api.py
```

### 命名規則

| 種別 | 規則 | 例 |
|-----|------|---|
| テストファイル | `test_{module名}.py` | `test_project_service.py` |
| テストクラス | `Test{クラス名}` | `TestProjectService` |
| テスト関数 | `test_{動詞}_{対象}_{条件}` | `test_create_project_success` |

### テストコード例（pytest）

```python
import pytest
from httpx import AsyncClient
from app.main import app

class TestProjectAPI:
    """工事案件APIのテスト。"""

    @pytest.mark.asyncio
    async def test_create_project_success(
        self,
        client: AsyncClient,
        auth_headers: dict,
        project_manager_user
    ):
        """正常な案件作成のテスト。"""
        payload = {
            "project_code": "P2026-TEST-001",
            "project_name": "テスト工事",
            "client_name": "テスト建設株式会社",
            "start_date": "2026-06-01",
            "end_date": "2026-12-31"
        }
        response = await client.post(
            "/api/v1/projects",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert data["data"]["project_code"] == "P2026-TEST-001"
        assert data["data"]["status"] == "planning"

    @pytest.mark.asyncio
    async def test_create_project_duplicate_code(
        self,
        client: AsyncClient,
        auth_headers: dict,
        existing_project
    ):
        """重複コードでの案件作成エラーのテスト。"""
        payload = {
            "project_code": existing_project.project_code,  # 既存コード
            "project_name": "重複テスト工事",
            "client_name": "テスト建設",
            "start_date": "2026-06-01"
        }
        response = await client.post(
            "/api/v1/projects",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "CONFLICT"
```

---

## フロントエンドテスト規約（Jest/Playwright）

### Jest（単体テスト）

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectForm } from '@/components/projects/ProjectForm'

describe('ProjectForm', () => {
  it('必須フィールドが空のとき送信できないこと', async () => {
    render(<ProjectForm />)
    
    const submitButton = screen.getByRole('button', { name: '作成' })
    fireEvent.click(submitButton)
    
    expect(screen.getByText('案件名は必須です')).toBeInTheDocument()
  })
})
```

---

## テストデータ管理

| 方法 | 用途 | 例 |
|-----|------|---|
| Fixture | 固定的なテストデータ | conftest.pyのフィクスチャ |
| Factory | 動的なテストデータ生成 | factory_boy |
| Seed | 初期データ投入 | データベースシード |

---

## CI/CDでのテスト実行

```yaml
# .github/workflows/ci.yml（抜粋）
- name: Run tests with coverage
  run: |
    pytest tests/ \
      --cov=app \
      --cov-report=xml \
      --cov-fail-under=80 \
      -v
  working-directory: backend
```
