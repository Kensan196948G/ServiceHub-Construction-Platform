# テスト環境設計（Test Environment Design）

## 1. テスト環境一覧

| 環境名 | 目的 | 管理者 | アクセス方法 |
|--------|------|-------|------------|
| ローカル開発環境 | 開発者の動作確認 | 各開発者 | localhost |
| CI環境（GitHub Actions） | 自動テスト | DevOps担当 | GitHub Actions |
| Staging環境 | E2E・UAT | IT管理者 | https://staging.example.com |
| パフォーマンス環境 | 負荷テスト | IT管理者 | https://perf.example.com |

---

## 2. ローカル開発環境

### Docker Compose構成

```yaml
# docker-compose.dev.yml
version: '3.9'
services:
  api:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql+asyncpg://user:pass@db:5432/servicehub_dev
      REDIS_URL: redis://redis:6379/0
    volumes:
      - ./backend:/app
    depends_on: [db, redis, minio]

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    volumes:
      - ./frontend:/app

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: servicehub_dev
    ports: ["5432:5432"]
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports: ["6379:6379"]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data

  elasticsearch:
    image: elasticsearch:8.12.0
    environment:
      discovery.type: single-node
      xpack.security.enabled: false
    ports: ["9200:9200"]

volumes:
  pg_data:
  minio_data:
```

### ローカル環境起動手順

```bash
# 初回セットアップ
git clone https://github.com/Kensan196948G/ServiceHub-Construction-Platform
cd ServiceHub-Construction-Platform
cp .env.example .env.dev

# Docker起動
docker compose -f docker-compose.dev.yml up -d

# DBマイグレーション
docker compose exec api alembic upgrade head

# テストデータ投入
docker compose exec api python scripts/seed_dev_data.py

# アプリ確認
open http://localhost:3000  # フロントエンド
open http://localhost:8000/docs  # API仕様書
```

---

## 3. テストデータ管理

### テストデータの種類

| 種別 | 内容 | 管理方法 |
|------|------|---------|
| フィクスチャ | 最小限のテスト用データ | Pythonコードで定義 |
| シードデータ | 開発・Stagingの初期データ | SQLスクリプト |
| ファクトリー | テスト毎に動的生成 | factory_boy |
| スナップショット | 本番データの匿名化版 | 四半期更新 |

### factory_boyを使ったテストデータ生成

```python
# tests/factories.py
import factory
from factory.fuzzy import FuzzyChoice, FuzzyDate
from datetime import date

class UserFactory(factory.Factory):
    class Meta:
        model = User
    
    id = factory.LazyFunction(uuid4)
    username = factory.Sequence(lambda n: f"user_{n:04d}")
    email = factory.LazyAttribute(lambda o: f"{o.username}@test.example.com")
    full_name = factory.Faker('name', locale='ja_JP')
    hashed_password = factory.LazyFunction(lambda: get_password_hash("Test@12345"))
    is_active = True

class ProjectFactory(factory.Factory):
    class Meta:
        model = Project
    
    id = factory.LazyFunction(uuid4)
    name = factory.Sequence(lambda n: f"テスト工事 {n:04d}")
    project_code = factory.Sequence(lambda n: f"PRJ-{n:04d}")
    status = FuzzyChoice(['planning', 'active', 'completed'])
    start_date = FuzzyDate(start_date=date(2026, 4, 1))
    pm = factory.SubFactory(UserFactory)
```

---

## 4. Staging環境

### 構成

```
Staging環境:
  - Web: Nginx × 1
  - API: FastAPI × 2（負荷分散テスト用）
  - DB: PostgreSQL（本番同スペック）
  - Redis: 1ノード
  - MinIO: 1ノード
  - Elasticsearch: 1ノード

データ:
  - 本番の匿名化データ（月次更新）
  - ユーザー: 50名分のテストアカウント
  - 案件: 100件のテスト案件
  - 日報: 1,000件のテスト日報
  - 写真: 5,000枚のテスト写真
```

### Staging環境リセット

```bash
# Staging環境を本番相当のデータにリセット（月次）
./scripts/reset-staging.sh

# 実行内容:
# 1. 全テーブルTRUNCATE
# 2. マイグレーション最新版適用
# 3. 匿名化データを投入
# 4. テストユーザーアカウント作成
# 5. MinIOバケットのファイルをリセット
```

---

## 5. テスト環境のセキュリティ

| 要件 | 対応 |
|------|------|
| 本番データの持ち込み禁止 | テストデータは全て匿名化 |
| アクセス制限 | Staging環境はVPN内からのみアクセス可 |
| 認証情報の分離 | 本番・Stagingで異なるシークレット使用 |
| データ廃棄 | テスト完了後のデータは定期クリーンアップ |
| アクセスログ | Staging環境の操作もログ記録 |
