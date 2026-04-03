# フルスタック起動確認レポート

> 作成日: 2026-04-03  
> 対応 Issue: #32  
> 作業ディレクトリ: `/mnt/LinuxHDD/ServiceHub-Construction-Platform`  
> compose ファイル: `docker-compose.local.yml`

---

## 1. 起動したサービス一覧

| コンテナ名 | サービス | イメージ | ポート | ステータス |
|---|---|---|---|---|
| servicehub-db | db | postgres:15-alpine | 5435→5432 | Up (healthy) |
| servicehub-redis | redis | redis:7-alpine | 6380→6379 | Up (healthy) |
| servicehub-api | api | servicehub-construction-platform-api | 8888→8000 | Up (healthy) |
| servicehub-frontend | frontend | servicehub-construction-platform-frontend | 4173→3000 | Up |
| servicehub-nginx | nginx | nginx:alpine | 7080→80 | Up |

---

## 2. 各サービスのヘルスチェック結果

### 2-1. API ヘルスチェック（直接）

```
GET http://localhost:8888/health
```

```json
{"status":"healthy","service":"servicehub-api","version":"0.1.0"}
```

### 2-2. API ステータス（直接）

```
GET http://localhost:8888/api/v1/status
```

```json
{
  "success": true,
  "data": {
    "api": "ServiceHub Construction Platform",
    "version": "0.1.0",
    "environment": "development",
    "phase": "Phase1 - 基盤構築中"
  }
}
```

### 2-3. API ヘルスチェック（nginx 経由）

```
GET http://localhost:7080/health
```

```json
{"status":"healthy","service":"servicehub-api","version":"0.1.0"}
```

### 2-4. API ステータス（nginx 経由）

```
GET http://localhost:7080/api/v1/status
```

```json
{
  "success": true,
  "data": {
    "api": "ServiceHub Construction Platform",
    "version": "0.1.0",
    "environment": "development",
    "phase": "Phase1 - 基盤構築中"
  }
}
```

### 2-5. Frontend（nginx 経由）

```
GET http://localhost:7080/
```

HTTP 200 OK — Vite 開発サーバー経由で React アプリが応答。

---

## 3. アクセス可能な URL 一覧

| 用途 | URL | 備考 |
|---|---|---|
| Frontend (直接) | http://localhost:4173/ | Vite dev server |
| Frontend (nginx 経由) | http://localhost:7080/ | リバースプロキシ経由 |
| API (直接) | http://localhost:8888/ | FastAPI |
| API ヘルス (直接) | http://localhost:8888/health | |
| API ステータス (直接) | http://localhost:8888/api/v1/status | |
| API ヘルス (nginx 経由) | http://localhost:7080/health | |
| API ステータス (nginx 経由) | http://localhost:7080/api/v1/status | |
| API ドキュメント (直接) | http://localhost:8888/docs | Swagger UI |
| API ドキュメント (nginx 経由) | http://localhost:7080/docs | nginx プロキシ |
| PostgreSQL | localhost:5435 | DB: servicehub_db |
| Redis | localhost:6380 | |

---

## 4. 構成メモ

- nginx は `./nginx/nginx.conf` をマウント
- `upstream api { server api:8000; }` / `upstream frontend { server frontend:3000; }` で内部名前解決
- `/api/` プレフィックスで API へルーティング、`/` は Frontend へルーティング
- `/health` と `/docs` は API へ直接プロキシ

---

## 5. 既知の注意点

- `docker-compose.local.yml` の `version` 属性は obsolete（警告表示あり、動作には影響なし）
- MinIO (`servicehub-minio`) はこの確認では起動していない
- Frontend の `VITE_API_BASE_URL` は `http://localhost:8000` に設定されているが、nginx 経由では `http://localhost:7080/api/` を使用することを推奨
