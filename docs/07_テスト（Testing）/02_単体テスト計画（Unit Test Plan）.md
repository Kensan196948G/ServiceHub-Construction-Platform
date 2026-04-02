# 単体テスト計画（Unit Test Plan）

## 1. 単体テスト方針

| 方針 | 内容 |
|------|------|
| テスト対象 | サービス層・ユーティリティ・バリデーション |
| テストフレームワーク | pytest（バックエンド）/ Vitest（フロントエンド） |
| カバレッジ目標 | 85%以上（バックエンド）/ 70%以上（フロントエンド） |
| テスト設計手法 | TDD（テスト駆動開発）推奨 |
| モック戦略 | 外部依存（DB・API・メール）はモック化 |

---

## 2. バックエンド単体テスト

### テスト対象優先度

| 優先度 | 対象 | 理由 |
|--------|------|------|
| 高 | ビジネスロジック（service.py） | コアロジック・バグ影響大 |
| 高 | バリデーション（schemas.py） | セキュリティ・データ品質 |
| 高 | セキュリティ機能（認証・認可） | セキュリティリスク |
| 中 | ユーティリティ関数 | 再利用性高 |
| 低 | データアクセス層（repository.py） | DBに近い＝統合テストでカバー |

### テスト命名規則

```python
# パターン: test_{メソッド名}_{条件}_{期待結果}
class TestProjectService:
    
    async def test_create_project_with_valid_data_returns_project(self):
        """正常なデータで案件を作成できる"""
        ...
    
    async def test_create_project_with_duplicate_code_raises_conflict_error(self):
        """重複する案件コードで409エラーが発生する"""
        ...
    
    async def test_get_project_by_nonexistent_id_returns_none(self):
        """存在しないIDの案件取得でNoneを返す"""
        ...
```

### サービス層テスト例

```python
# tests/unit/test_services/test_project_service.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
from app.modules.projects.service import ProjectService
from app.modules.projects.schemas import ProjectCreate

class TestProjectService:
    @pytest.fixture
    def mock_repo(self):
        return AsyncMock()
    
    @pytest.fixture
    def service(self, mock_repo):
        return ProjectService(repo=mock_repo)
    
    async def test_create_project_success(self, service, mock_repo):
        """案件作成の正常系テスト"""
        # Arrange
        project_data = ProjectCreate(
            name="○○ビル新築工事",
            project_code="PRJ-001",
            start_date="2026-06-01",
        )
        expected_project = MagicMock(id=uuid4(), name="○○ビル新築工事")
        mock_repo.create.return_value = expected_project
        mock_repo.get_by_code.return_value = None  # 重複なし
        
        # Act
        result = await service.create_project(project_data, creator_id=uuid4())
        
        # Assert
        assert result.name == "○○ビル新築工事"
        mock_repo.create.assert_called_once()
    
    async def test_create_project_duplicate_code_raises_error(self, service, mock_repo):
        """重複案件コードでエラー発生テスト"""
        # Arrange
        existing_project = MagicMock(id=uuid4())
        mock_repo.get_by_code.return_value = existing_project
        
        project_data = ProjectCreate(
            name="案件名",
            project_code="EXISTING-001",
        )
        
        # Act & Assert
        with pytest.raises(ProjectCodeDuplicateError):
            await service.create_project(project_data, creator_id=uuid4())
```

---

## 3. フロントエンド単体テスト

### テスト対象

| 対象 | ツール | 目的 |
|------|--------|------|
| カスタムHooks | Vitest | データフェッチ・状態管理 |
| ユーティリティ関数 | Vitest | 日付フォーマット・計算 |
| バリデーション | Vitest | フォームバリデーション |
| UIコンポーネント | Vitest + Testing Library | レンダリング・インタラクション |

### コンポーネントテスト例

```typescript
// tests/unit/components/ProjectStatusBadge.test.tsx
import { render, screen } from '@testing-library/react';
import { ProjectStatusBadge } from '@/components/ProjectStatusBadge';

describe('ProjectStatusBadge', () => {
  test.each([
    ['active', '施工中', 'bg-green-100'],
    ['planning', '受注前', 'bg-blue-100'],
    ['completed', '完了', 'bg-gray-100'],
    ['cancelled', '中止', 'bg-red-100'],
  ])('ステータス %s のバッジを正しく表示する', (status, label, className) => {
    render(<ProjectStatusBadge status={status as ProjectStatus} />);
    
    const badge = screen.getByText(label);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass(className);
  });
});
```

---

## 4. カバレッジ設定

### Python（pytest-cov）

```ini
# .coveragerc
[run]
source = app
omit =
    app/migrations/*
    app/main.py
    */tests/*
    */conftest.py

[report]
fail_under = 80
exclude_lines =
    pragma: no cover
    def __repr__
    raise NotImplementedError
    if TYPE_CHECKING:
```

### TypeScript（Vitest）

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
      exclude: [
        'src/main.tsx',
        'src/routeTree.gen.ts',
        '**/*.d.ts',
        '**/index.ts',
      ],
    },
  },
});
```

---

## 5. テスト実施スケジュール

| フェーズ | テスト対象 | 期間 | 目標カバレッジ |
|---------|----------|------|------------|
| Phase1 | 認証・共通基盤 | 2026/04/02〜04/30 | 85% |
| Phase2 | 案件管理・日報管理 | 2026/05/01〜05/30 | 85% |
| Phase3 | 写真・安全・原価 | 2026/06/01〜06/30 | 85% |
| Phase4 | ITSM・ナレッジ・AI | 2026/07/01〜07/31 | 80% |
| Phase5 | 全モジュール統合 | 2026/08/01〜08/31 | 90% |
