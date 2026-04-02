# コーディング規約

## 概要

本ドキュメントでは、ServiceHub Construction Platform の開発で遵守するコーディング規約を定義する。Python（バックエンド）とTypeScript（フロントエンド）の規約を定める。

---

## Python コーディング規約

### 基本規約

| 項目 | 規約 |
|-----|------|
| スタイル | PEP8準拠 |
| フォーマッタ | Black（行長88文字） |
| インポート整理 | isort |
| 型ヒント | 全関数・変数に型ヒント必須 |
| 型チェック | mypy（strict mode） |
| ドキュメンテーション | Google スタイルのdocstring |

### 命名規則（Python）

| 種別 | 規則 | 例 |
|-----|------|---|
| 変数 | snake_case | `project_name`, `user_id` |
| 関数 | snake_case | `get_project_by_id()` |
| クラス | PascalCase | `ProjectService`, `UserModel` |
| 定数 | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `DEFAULT_PAGE_SIZE` |
| プライベート | アンダースコアプレフィックス | `_validate_token()` |
| モジュール | snake_case | `project_service.py` |

### コード例（Python）

```python
from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ProjectNotFoundError
from app.modules.projects.models import Project
from app.modules.projects.schemas import ProjectCreate, ProjectResponse


class ProjectService:
    """工事案件管理サービス。
    
    案件のCRUD操作およびビジネスロジックを提供する。
    """
    
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
    
    async def get_by_id(self, project_id: UUID) -> Optional[Project]:
        """案件IDで案件を取得する。
        
        Args:
            project_id: 取得する案件のUUID
            
        Returns:
            案件オブジェクト。見つからない場合はNone。
        """
        project = await self.db.get(Project, project_id)
        if project is None or project.is_deleted:
            return None
        return project
    
    async def create(
        self,
        data: ProjectCreate,
        created_by: UUID
    ) -> Project:
        """新規案件を作成する。"""
        project = Project(**data.model_dump(), created_by=created_by)
        self.db.add(project)
        await self.db.commit()
        await self.db.refresh(project)
        return project
```

---

## TypeScript コーディング規約

### 基本規約

| 項目 | 規約 |
|-----|------|
| フォーマッタ | Prettier |
| リンター | ESLint（Next.js設定） |
| 型 | any禁止、strict mode有効 |
| インポート | named importを優先 |
| コンポーネント | 関数コンポーネント（Hooksを使用） |

### 命名規則（TypeScript）

| 種別 | 規則 | 例 |
|-----|------|---|
| 変数・関数 | camelCase | `projectName`, `getProjectById` |
| コンポーネント | PascalCase | `ProjectCard`, `DailyReportForm` |
| 型・インターフェース | PascalCase | `Project`, `DailyReport` |
| 定数 | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| ファイル（コンポーネント） | PascalCase | `ProjectCard.tsx` |
| ファイル（ユーティリティ） | camelCase | `formatDate.ts` |

### コード例（TypeScript）

```typescript
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ProjectCreate, Project } from '@/types/project'
import { createProject } from '@/api/projects'

interface ProjectFormProps {
  onSuccess?: (project: Project) => void
}

export function ProjectForm({ onSuccess }: ProjectFormProps) {
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const mutation = useMutation({
    mutationFn: (data: ProjectCreate) => createProject(data),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      onSuccess?.(project)
    },
  })

  const handleSubmit = async (data: ProjectCreate) => {
    setIsSubmitting(true)
    try {
      await mutation.mutateAsync(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* フォームコンテンツ */}
    </form>
  )
}
```

---

## コードレビューチェックリスト

- [ ] 型ヒント/型定義が正確か
- [ ] エラーハンドリングが適切か
- [ ] セキュリティ（SQL Injection, XSS等）の考慮があるか
- [ ] 単体テストが実装されているか
- [ ] 命名規則が遵守されているか
- [ ] 不要なコメント・デバッグコードがないか
- [ ] ドキュメントコメント（docstring/JSDoc）が記述されているか
