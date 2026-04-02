# デプロイメントガイド（社内リリース手順）

## 前提条件

- Docker / Docker Compose v2 インストール済み
- 社内サーバー（Ubuntu 22.04 LTS推奨）
- HTTPS証明書（Let's Encrypt or 社内CA）
- 最低スペック: CPU 4コア / RAM 8GB / SSD 100GB

## 手順

### 1. リポジトリ取得

```bash
git clone https://github.com/Kensan196948G/ServiceHub-Construction-Platform.git
cd ServiceHub-Construction-Platform
git checkout main
```

### 2. 環境変数設定

```bash
cp .env.prod.example .env.prod
# .env.prod を編集して全ての CHANGE_ME_* を適切な値に変更
vi .env.prod
```

**必須変更項目:**
- `POSTGRES_PASSWORD` — 強力なパスワード（20文字以上推奨）
- `REDIS_PASSWORD` — 強力なパスワード
- `JWT_SECRET_KEY` — 32文字以上のランダム文字列
- `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`
- `ALLOWED_ORIGINS` — 社内ドメイン（例: `https://servicehub.example.co.jp`）

### 3. DBマイグレーション実行

```bash
docker compose -f docker-compose.prod.yml up db -d
docker compose -f docker-compose.prod.yml run --rm api alembic upgrade head
```

### 4. アプリケーション起動

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

### 5. 初期ユーザー作成

```bash
docker compose -f docker-compose.prod.yml exec api python -m app.scripts.init_admin
```

### 6. ヘルスチェック確認

```bash
curl https://your-domain.example.com/health
# → {"status":"healthy","version":"1.0.0"}
```

## ロールバック手順

```bash
# 直前バージョンに戻す
git checkout <previous-tag>
docker compose -f docker-compose.prod.yml build api frontend
docker compose -f docker-compose.prod.yml up -d --no-deps api frontend
# DBマイグレーションを戻す場合
docker compose -f docker-compose.prod.yml run --rm api alembic downgrade -1
```

## 監視・ログ

```bash
# ログ確認
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f nginx

# リソース確認
docker stats
```
