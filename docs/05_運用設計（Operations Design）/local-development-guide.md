# ローカル開発環境ガイド

> ServiceHub Construction Platform — ローカル開発環境の構築・運用手順

---

## 目次

1. [前提条件](#前提条件)
2. [ポート番号一覧](#ポート番号一覧)
3. [環境起動手順](#環境起動手順)
4. [動作確認](#動作確認)
5. [E2Eテスト実行方法](#e2eテスト実行方法)
6. [シードデータ投入方法](#シードデータ投入方法)
7. [よくあるトラブルと解決方法](#よくあるトラブルと解決方法)
8. [環境停止・クリーンアップ](#環境停止クリーンアップ)

---

## 前提条件

| ツール | 最小バージョン | 確認コマンド |
|--------|----------------|--------------|
| Docker Engine | 24.x 以上 | `docker --version` |
| Docker Compose | 2.x 以上 | `docker compose version` |
| Git | 2.x 以上 | `git --version` |
| bash | 5.x 以上 | `bash --version` |

---

## ポート番号一覧

> `docker-compose.local.yml` はデフォルトポート（8000, 5432 等）との競合を回避するため、  
> ホスト側ポートをずらした構成になっています。

| サービス | コンテナ名 | ホストポート | コンテナポート | 用途 |
|----------|-----------|-------------|----------------|------|
| **API** (FastAPI) | `servicehub-api` | **8888** | 8000 | REST API サーバー |
| **Frontend** (React/Vite) | `servicehub-frontend` | **4173** | 3000 | フロントエンド UI |
| **Nginx** (Reverse Proxy) | `servicehub-nginx` | **7080** | 80 | リバースプロキシ |
| **PostgreSQL 15** | `servicehub-db` | **5435** | 5432 | メインデータベース |
| **Redis 7** | `servicehub-redis` | **6380** | 6379 | キャッシュ・セッション |
| **MinIO** (S3互換ストレージ) | `servicehub-minio` | **9010** / **9011** | 9000 / 9001 | ファイルストレージ / 管理コンソール |

### アクセスURL一覧

| サービス | URL |
|----------|-----|
| API (直接) | http://localhost:8888 |
| API ドキュメント (Swagger UI) | http://localhost:8888/docs |
| API ドキュメント (ReDoc) | http://localhost:8888/redoc |
| ヘルスチェック | http://localhost:8888/health |
| フロントエンド | http://localhost:4173 |
| Nginx 経由 | http://localhost:7080 |
| MinIO 管理コンソール | http://localhost:9011 |

---

## 環境起動手順

### 1. リポジトリクローン・初期設定

```bash
git clone https://github.com/<org>/ServiceHub-Construction-Platform.git
cd ServiceHub-Construction-Platform
```

### 2. 環境変数設定（オプション）

```bash
# SECRET_KEY を上書きしたい場合（任意）
export SECRET_KEY="your-dev-secret-key"
```

デフォルト値（`dev-secret-key-change-in-production`）はローカル開発用として使用可能です。

### 3. Docker イメージのビルドと起動

```bash
# ローカル開発用 compose ファイルを使用
docker compose -f docker-compose.local.yml up -d --build
```

> 初回ビルドは 3〜5 分程度かかります。

### 4. 起動確認

```bash
# コンテナの状態確認
docker compose -f docker-compose.local.yml ps

# ヘルスチェック
curl http://localhost:8888/health
```

期待されるレスポンス:

```json
{
  "status": "healthy",
  "service": "ServiceHub Construction Platform"
}
```

### 5. ログ確認

```bash
# 全サービスのログ
docker compose -f docker-compose.local.yml logs -f

# API のみ
docker compose -f docker-compose.local.yml logs -f api

# DB のみ
docker compose -f docker-compose.local.yml logs -f db
```

---

## 動作確認

### API ステータス確認

```bash
curl http://localhost:8888/api/v1/status
```

### ログイン確認

```bash
curl -X POST http://localhost:8888/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin1234!"}'
```

レスポンスに `access_token` が含まれれば正常です。

---

## E2Eテスト実行方法

統合ヘルスチェックスクリプト（`scripts/e2e_health_check.sh`）により、  
全モジュールのAPIを自動検証します。

### 実行手順

```bash
# 実行権限付与（初回のみ）
chmod +x scripts/e2e_health_check.sh

# ローカル環境に対して実行（デフォルト: http://localhost:8888）
bash scripts/e2e_health_check.sh

# 別ポートを指定する場合
bash scripts/e2e_health_check.sh http://localhost:8888
```

### チェック項目（全10チェック）

| # | カテゴリ | チェック内容 |
|---|----------|-------------|
| 1 | System | `/health` — ヘルスチェック |
| 2 | System | `/api/v1/status` — APIステータス |
| 3 | System | `/docs` — Swagger UI |
| 4 | Auth | ログイン（JWTトークン取得） |
| 5 | Modules | 案件一覧取得 |
| 6 | Modules | インシデント一覧取得 |
| 7 | Modules | ナレッジ記事一覧取得 |
| 8 | Modules | 日報一覧取得（テスト案件作成後） |
| 9 | Modules | 安全確認一覧取得 |
| 10 | Modules | 予実サマリー取得 |

### 期待される出力

```
======================================================
 ServiceHub E2E Health Check - http://localhost:8888
======================================================
[ System ]
  PASS: Health
  PASS: Status
  PASS: Docs
[ Auth ]
  PASS: Login
[ Modules ]
  PASS: Projects
  PASS: ITSM
  PASS: Knowledge
  PASS: DailyReports
  PASS: Safety
  PASS: CostSummary
======================================================
 Results: PASS=10  FAIL=0
======================================================
```

---

## シードデータ投入方法

### 初期管理者ユーザーについて

Alembic マイグレーション実行時に、デフォルトの管理者ユーザーが自動作成されます。

| 項目 | 値 |
|------|----|
| メールアドレス | `admin@example.com` |
| パスワード | `Admin1234!` |
| ロール | `ADMIN` |

### マイグレーション実行（コンテナ起動時に自動実行）

```bash
# 手動でマイグレーションを実行する場合
docker compose -f docker-compose.local.yml exec api alembic upgrade head
```

### テストデータの手動投入

```bash
# Python スクリプトで追加テストデータを投入する場合
docker compose -f docker-compose.local.yml exec api python -c "
from app.db.base import get_db
# 必要に応じてシードロジックを実行
print('seed complete')
"
```

### API 経由でのデータ投入

```bash
# 1. ログインしてトークン取得
TOKEN=$(curl -s -X POST http://localhost:8888/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin1234!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 2. テスト案件作成
curl -X POST http://localhost:8888/api/v1/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "サンプル工事案件",
    "project_code": "PRJ-2026-001",
    "status": "active",
    "client_name": "株式会社サンプル建設",
    "start_date": "2026-04-01",
    "budget": 10000000
  }'
```

---

## よくあるトラブルと解決方法

### トラブル1: ポートが既に使用されている

**症状:**
```
Error response from daemon: driver failed programming external connectivity on endpoint
servicehub-api: Bind for 0.0.0.0:8888 failed: port is already allocated
```

**解決方法:**
```bash
# 使用中のポートを確認
lsof -i :8888
# または
ss -tlnp | grep 8888

# 占有しているプロセスを停止
kill -9 <PID>
```

---

### トラブル2: DB が起動しない / マイグレーションが失敗する

**症状:**
```
FATAL: database "servicehub_db" does not exist
```

**解決方法:**
```bash
# ボリュームを削除して再起動
docker compose -f docker-compose.local.yml down -v
docker compose -f docker-compose.local.yml up -d --build
```

---

### トラブル3: API が "unhealthy" になる

**症状:** `docker compose ps` で api コンテナが `unhealthy` 状態

**確認手順:**
```bash
# API ログ確認
docker compose -f docker-compose.local.yml logs api | tail -50

# DB 接続確認
docker compose -f docker-compose.local.yml exec db pg_isready -U servicehub -d servicehub_db
```

**解決方法:**
```bash
# API コンテナのみ再起動
docker compose -f docker-compose.local.yml restart api
```

---

### トラブル4: MinIO への接続エラー

**症状:** 写真アップロードで 500 エラーが発生する

**確認手順:**
```bash
# MinIO ヘルスチェック
curl http://localhost:9010/minio/health/live
```

**解決方法:**
```bash
# MinIO コンテナを再起動
docker compose -f docker-compose.local.yml restart minio

# MinIO 管理コンソールでバケット作成を確認
# http://localhost:9011 (admin: minioadmin / minioadmin123)
```

---

### トラブル5: フロントエンドのビルドが失敗する

**症状:** `servicehub-frontend` が起動しない

**確認手順:**
```bash
docker compose -f docker-compose.local.yml logs frontend | tail -50
```

**解決方法:**
```bash
# node_modules キャッシュを削除してリビルド
docker compose -f docker-compose.local.yml down
docker volume prune -f
docker compose -f docker-compose.local.yml up -d --build
```

---

### トラブル6: Redis 接続エラー

**症状:** API ログに Redis 接続エラーが出力される

**確認手順:**
```bash
docker compose -f docker-compose.local.yml exec redis redis-cli ping
```

期待レスポンス: `PONG`

**解決方法:**
```bash
docker compose -f docker-compose.local.yml restart redis
```

---

### トラブル7: JWT トークンエラー（401 Unauthorized）

**症状:** 認証済みのリクエストで `401` が返る

**原因と対応:**

| 原因 | 対応 |
|------|------|
| アクセストークンの有効期限切れ（15分） | `/api/v1/auth/refresh` でトークン更新 |
| `Authorization: Bearer` ヘッダーが未設定 | ヘッダーを正しく設定 |
| 環境変数 `SECRET_KEY` が変更された | 再ログインしてトークン取得 |

---

## 環境停止・クリーンアップ

```bash
# コンテナ停止（データ保持）
docker compose -f docker-compose.local.yml stop

# コンテナ停止・削除（データ保持）
docker compose -f docker-compose.local.yml down

# コンテナ・ボリューム削除（データも削除）
docker compose -f docker-compose.local.yml down -v

# イメージも削除する場合
docker compose -f docker-compose.local.yml down -v --rmi local
```

---

## 関連ドキュメント

- [API リファレンス](../09_API仕様（API Specifications）/api-reference-v1.0.0.md)
- [セキュリティ概要](../06_セキュリティ（Security）/security-overview-v1.0.0.md)
- [バックアップ設計](07_バックアップ設計（Backup Design）.md)
