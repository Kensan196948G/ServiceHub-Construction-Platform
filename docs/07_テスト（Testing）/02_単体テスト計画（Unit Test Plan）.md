# 単体テスト計画

## 概要
各モジュールの単体テスト方針・実装ガイドラインを定義する。

## バックエンド単体テスト（pytest）

### ディレクトリ構造
```
tests/
├── unit/
│   ├── test_auth.py
│   ├── test_projects.py
│   ├── test_daily_reports.py
│   ├── test_photos.py
│   ├── test_safety.py
│   ├── test_cost.py
│   └── conftest.py
├── integration/
└── e2e/
```

### テストケース例（認証モジュール）
```python
# tests/unit/test_auth.py
import pytest
from unittest.mock import AsyncMock, patch
from app.services.auth import AuthService
from app.schemas.auth import LoginRequest

class TestAuthService:
    @pytest.fixture
    def auth_service(self):
        return AuthService()
    
    async def test_login_success(self, auth_service):
        """正常なログインのテスト"""
        mock_user = {"id": 1, "email": "test@example.com", "role": "admin"}
        with patch.object(auth_service, 'get_user_by_email', return_value=mock_user):
            with patch.object(auth_service, 'verify_password', return_value=True):
                result = await auth_service.login(
                    LoginRequest(email="test@example.com", password="password")
                )
                assert result.access_token is not None
                assert result.token_type == "bearer"
    
    async def test_login_invalid_password(self, auth_service):
        """無効なパスワードのテスト"""
        with patch.object(auth_service, 'verify_password', return_value=False):
            with pytest.raises(UnauthorizedException):
                await auth_service.login(
                    LoginRequest(email="test@example.com", password="wrong")
                )
    
    async def test_token_expiry(self, auth_service):
        """トークン有効期限のテスト"""
        expired_token = "expired.jwt.token"
        with pytest.raises(TokenExpiredException):
            await auth_service.verify_token(expired_token)
```

### テストカバレッジ要件

| モジュール | 目標カバレッジ | 優先度 |
|-----------|-------------|--------|
| 認証・認可 | 95% | 最高 |
| 工事案件管理 | 85% | 高 |
| 日報管理 | 85% | 高 |
| 写真管理 | 80% | 中 |
| 安全品質管理 | 85% | 高 |
| 原価管理 | 90% | 高 |
| AI支援機能 | 75% | 中 |
| ITSM機能 | 80% | 中 |

## フロントエンド単体テスト（Jest + Testing Library）

```typescript
// __tests__/components/ProjectList.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectList } from '@/components/ProjectList'
import { mockProjects } from '@/test/fixtures'

describe('ProjectList', () => {
  it('案件一覧を正しく表示する', async () => {
    render(<ProjectList projects={mockProjects} />)
    
    expect(screen.getByText('山田建設 本社ビル改修工事')).toBeInTheDocument()
    expect(screen.getByText('進行中')).toBeInTheDocument()
  })
  
  it('検索フィルターが動作する', async () => {
    const user = userEvent.setup()
    render(<ProjectList projects={mockProjects} />)
    
    await user.type(screen.getByPlaceholderText('案件名で検索'), '本社')
    
    await waitFor(() => {
      expect(screen.getByText('山田建設 本社ビル改修工事')).toBeInTheDocument()
    })
  })
  
  it('空の案件リストでエラーを表示しない', () => {
    render(<ProjectList projects={[]} />)
    expect(screen.getByText('案件が見つかりません')).toBeInTheDocument()
  })
})
```

## モック戦略

| 依存コンポーネント | モック方法 | ツール |
|-----------------|---------|--------|
| データベース | インメモリDB | pytest-asyncio, SQLite |
| 外部API | レスポンスモック | responses, httpx Mock |
| Redis | フェイクRedis | fakeredis |
| ファイルストレージ | ローカルディレクトリ | tmpdir |
| OpenAI API | モックレスポンス | unittest.mock |
| メール送信 | メールバックエンド | Django test utils相当 |

## テスト実行設定

```ini
# pytest.ini
[pytest]
asyncio_mode = auto
testpaths = tests/unit
addopts = 
    --cov=app
    --cov-report=html
    --cov-report=xml
    --cov-fail-under=80
    -v
    --tb=short
markers =
    slow: 実行に時間がかかるテスト
    auth: 認証関連テスト
    database: DB操作テスト
```
