# マイグレーション戦略

## 概要
ServiceHub建設プラットフォームのデータベーススキーマ変更管理とマイグレーション戦略を定義する。Alembicを使用したバージョン管理を採用。

## マイグレーション管理ツール

| ツール | バージョン | 用途 |
|--------|----------|------|
| Alembic | 1.13.x | スキーマバージョン管理 |
| SQLAlchemy | 2.0.x | ORM・スキーマ定義 |
| PostgreSQL | 16.x | RDBMS |

## ディレクトリ構造

```
backend/
├── alembic.ini
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       ├── 001_initial_schema.py
│       ├── 002_add_ai_tables.py
│       └── ...
└── app/
    └── models/
        ├── base.py
        ├── user.py
        ├── project.py
        └── ...
```

## マイグレーションファイル規則

```python
# alembic/versions/001_initial_schema.py
"""Initial schema creation

Revision ID: 001abc123def
Revises: 
Create Date: 2026-04-02 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '001abc123def'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    """スキーマのアップグレード処理"""
    op.create_table(
        'users',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index('idx_users_email', 'users', ['email'])

def downgrade() -> None:
    """ロールバック処理"""
    op.drop_index('idx_users_email', 'users')
    op.drop_table('users')
```

## マイグレーション実行手順

### 通常のマイグレーション
```bash
# 現在のリビジョン確認
alembic current

# 未適用のマイグレーション確認
alembic history --verbose

# 最新まで適用
alembic upgrade head

# 特定バージョンまで適用
alembic upgrade 002abc123def

# 1つ前に戻す
alembic downgrade -1

# 特定バージョンに戻す
alembic downgrade 001abc123def
```

### 新しいマイグレーションファイル作成
```bash
# 手動でマイグレーション作成
alembic revision -m "add_photo_ai_tags_column"

# モデルから自動生成
alembic revision --autogenerate -m "add_photo_ai_tags_column"
```

## 本番環境マイグレーション手順

| ステップ | 内容 | 担当 | チェック |
|---------|------|------|---------|
| 1. 事前確認 | マイグレーション内容レビュー | リーダー | コードレビュー |
| 2. バックアップ | 本番DBフルバックアップ | インフラ | バックアップ確認 |
| 3. ステージング適用 | stagingで動作確認 | QA | テスト通過 |
| 4. メンテナンス告知 | 必要に応じて停止告知 | PM | 告知完了 |
| 5. 本番適用 | alembic upgrade head | インフラ | 成功確認 |
| 6. 動作確認 | ヘルスチェック・スモークテスト | QA | 正常動作 |
| 7. モニタリング | エラーレート・パフォーマンス監視 | 運用 | 30分間監視 |

## ゼロダウンタイムマイグレーション原則

```
❌ 危険な操作:
- カラムの直接削除
- NOT NULL制約の直接追加
- カラムのリネーム
- テーブルの再構築

✅ 安全なアプローチ:
1. 新カラム追加（nullable）
2. アプリで両方書き込み
3. バックフィル実行
4. NOT NULL制約追加
5. 旧カラム削除（次のデプロイ）
```

## ロールバック戦略

```python
# 緊急ロールバック手順
# 1. Alembicロールバック
alembic downgrade -1

# 2. バックアップからのリストア（必要な場合）
pg_restore -h $DB_HOST -U $DB_USER -d servicehub \
    --no-acl --no-owner \
    backup_20260415_020000.dump

# 3. アプリケーションの旧バージョンにロールバック
kubectl rollout undo deployment/servicehub-api
```

## CI/CDパイプラインでのマイグレーション

```yaml
# .github/workflows/deploy.yml (抜粋)
- name: Run database migrations
  run: |
    kubectl exec -n production deployment/servicehub-api \
      -- alembic upgrade head
  env:
    DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
```

## データ整合性チェック

マイグレーション後に自動実行するチェック：

```sql
-- 外部キー整合性確認
SELECT COUNT(*) FROM daily_reports dr
LEFT JOIN projects p ON dr.project_id = p.id
WHERE p.id IS NULL;

-- NULL制約違反確認  
SELECT COUNT(*) FROM users WHERE email IS NULL OR name IS NULL;
```
