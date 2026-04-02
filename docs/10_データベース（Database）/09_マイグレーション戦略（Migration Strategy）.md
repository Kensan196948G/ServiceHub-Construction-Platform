# 🔄 マイグレーション戦略（Migration Strategy）

## ツール
**Alembic**（Python / SQLAlchemy）または **Flyway** を使用。

## 命名規則
```
V{バージョン}__{説明}.sql
例: V001__create_users_table.sql
    V002__create_projects_table.sql
    V003__add_index_to_projects.sql
```

## マイグレーション実行手順

### 新規マイグレーション作成
```bash
alembic revision --autogenerate -m "create_projects_table"
```

### マイグレーション適用
```bash
# ローカル
alembic upgrade head

# 本番（ステージングで確認後）
alembic upgrade head --sql  # DRY RUN
alembic upgrade head        # 本番適用
```

### ロールバック
```bash
alembic downgrade -1        # 1つ戻す
alembic downgrade base      # 全て戻す
```

## フェーズ別マイグレーション計画

| バージョン | 内容 | フェーズ |
|-----------|------|---------|
| V001〜V005 | users, roles, projects | Phase 1 |
| V006〜V010 | daily_reports, photos | Phase 2 |
| V011〜V015 | safety, quality, costs | Phase 3 |
| V016〜V020 | itsm_*, knowledge_* | Phase 4 |
| V021〜V025 | ai_usage_logs, audit_logs | Phase 4 |

## 本番マイグレーション原則
- 必ずバックアップ後に実行
- DROP/TRUNCATE は原則禁止
- カラム削除は論理削除後3ヶ月で実施
- CIで自動テスト後のみ本番適用可
- 変更管理（ITSM Change）として記録
