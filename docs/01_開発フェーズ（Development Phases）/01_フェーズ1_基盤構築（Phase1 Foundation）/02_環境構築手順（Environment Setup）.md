# 開発環境構築手順

## 概要

本ドキュメントでは、ServiceHub Construction Platform の開発環境構築手順を説明する。Docker を中心とした環境を構築し、開発者全員が同一環境で開発できるようにする。

| コンポーネント | バージョン | 用途 |
|-------------|---------|------|
| Docker | 25.x | コンテナ実行基盤 |
| Docker Compose | 2.x | マルチコンテナ管理 |
| Node.js | 20.x LTS | フロントエンド開発 |
| Python | 3.12.x | バックエンド開発 |
| PostgreSQL | 16.x | メインデータベース |
| Redis | 7.x | キャッシュ・セッション管理 |
| GitHub Actions | - | CI/CD自動化 |

---

## 前提条件

- OS: Ubuntu 22.04 LTS / macOS 14+ / Windows 11 (WSL2)
- Docker Desktop 4.x 以上インストール済み
- Git 2.x 以上インストール済み
- VSCode（推奨エディタ）インストール済み

---

## 1. リポジトリクローン

```bash
git clone https://github.com/Kensan196948G/ServiceHub-Construction-Platform.git
cd ServiceHub-Construction-Platform
```

---

## 2. 環境変数設定

```bash
# .env.example をコピー
cp .env.example .env

# 必要に応じて .env を編集
vim .env
```

`.env` の主要設定項目：

```env
# アプリケーション設定
APP_ENV=development
APP_SECRET_KEY=your-secret-key-here
DEBUG=true

# データベース設定
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=servicehub
POSTGRES_USER=servicehub_user
POSTGRES_PASSWORD=your-db-password

# Redis設定
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT設定
JWT_SECRET_KEY=your-jwt-secret
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# OAuth2.0設定
OAUTH2_CLIENT_ID=your-client-id
OAUTH2_CLIENT_SECRET=your-client-secret

# AWS/MinIO設定（写真管理用）
S3_ENDPOINT_URL=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET_NAME=servicehub-media
```

---

## 3. Docker環境の起動

### docker-compose.yml の構成

```yaml
version: '3.9'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
    environment:
      - DATABASE_URL=postgresql://servicehub_user:password@postgres:5432/servicehub
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./backend:/app

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules

  postgres:
    image: postgres:16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: servicehub
      POSTGRES_USER: servicehub_user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --requirepass redispassword

  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

### コンテナ起動コマンド

```bash
# 全サービス起動
docker compose up -d

# ログ確認
docker compose logs -f

# 特定サービスのログ確認
docker compose logs -f backend

# サービス停止
docker compose down

# データボリューム含めて削除
docker compose down -v
```

---

## 4. バックエンド（Python/FastAPI）セットアップ

```bash
cd backend

# Python仮想環境作成
python -m venv venv
source venv/bin/activate  # Windowsは: venv\Scripts\activate

# 依存パッケージインストール
pip install -r requirements.txt

# 開発用依存パッケージインストール
pip install -r requirements-dev.txt

# データベースマイグレーション実行
alembic upgrade head

# 開発サーバー起動
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### requirements.txt の主要パッケージ

```
fastapi==0.110.0
uvicorn[standard]==0.29.0
sqlalchemy==2.0.28
alembic==1.13.1
psycopg2-binary==2.9.9
redis==5.0.3
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
pydantic==2.6.4
pydantic-settings==2.2.1
boto3==1.34.60
elasticsearch==8.12.1
openai==1.14.2
celery==5.3.6
pytest==8.1.1
pytest-asyncio==0.23.6
pytest-cov==5.0.0
httpx==0.27.0
```

---

## 5. フロントエンド（Next.js/TypeScript）セットアップ

```bash
cd frontend

# Node.js バージョン確認
node --version  # v20.x.x であること

# 依存パッケージインストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 型チェック
npm run type-check

# リント
npm run lint
```

---

## 6. PostgreSQL 初期設定

```bash
# PostgreSQLコンテナに接続
docker compose exec postgres psql -U servicehub_user -d servicehub

# データベース確認
\l

# テーブル確認（マイグレーション後）
\dt

# 接続終了
\q
```

---

## 7. Redis 動作確認

```bash
# Redisコンテナに接続
docker compose exec redis redis-cli -a redispassword

# 接続確認
PING  # PONG が返れば成功

# キー設定テスト
SET test_key "hello"
GET test_key

# 終了
EXIT
```

---

## 8. GitHub Actions CI/CD設定確認

```bash
# GitHub CLIでワークフロー確認
gh workflow list

# ワークフロー実行状態確認
gh run list
```

---

## 9. VSCode推奨設定

`.vscode/extensions.json`:
```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.vscode-pylance",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-azuretools.vscode-docker",
    "eamodio.gitlens",
    "streetsidesoftware.code-spell-checker"
  ]
}
```

---

## 10. トラブルシューティング

| 問題 | 原因 | 解決策 |
|-----|------|-------|
| PostgreSQL接続失敗 | ポート競合 | `lsof -i :5432` で確認し競合プロセスを停止 |
| Redisに接続できない | パスワード設定ミス | .envのREDIS_PASSWORDを確認 |
| マイグレーションエラー | DB未起動 | `docker compose up postgres -d` を先に実行 |
| npm installが失敗 | Node.jsバージョン | nvmで20.x LTSに切り替え |
| MinIOアクセスエラー | バケット未作成 | MinIO Console (localhost:9001) でバケット作成 |
