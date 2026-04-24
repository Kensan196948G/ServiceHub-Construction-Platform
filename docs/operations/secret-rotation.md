# Secret Rotation Procedures

ServiceHub Construction Platform で使用するシークレットの定期ローテーション手順書。
ISO 27001 A.10.1 (暗号鍵管理) / A.9.4 (アクセス制御) に準拠。

> **ローテーション頻度の目安**
> | シークレット種別 | 推奨頻度 |
> |---|---|
> | JWT_SECRET | 90 日ごと |
> | DB パスワード | 90 日ごと |
> | Redis パスワード | 90 日ごと |
> | OpenAI API キー | 漏洩検知時または 180 日 |
> | MinIO アクセスキー | 180 日ごと |

---

## 1. JWT_SECRET のローテーション

JWT アクセストークン / リフレッシュトークンの署名鍵。

### 手順

```bash
# 1. 新しいシークレットを生成
NEW_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(64))")

# 2. GitHub Secrets / 環境変数を更新
gh secret set JWT_SECRET --body "$NEW_SECRET"
# または docker-compose.yml / .env ファイルを更新

# 3. アプリを再起動 (ゼロダウンタイムのため Rolling 更新推奨)
docker compose up -d --no-deps backend

# 4. 既存トークンの無効化を確認
# 旧シークレットで署名されたトークンは再起動後に invalid になる
# → ユーザーに再ログインを促すアナウンスを実施
```

### 注意事項

- ローテーション後、旧トークン保持ユーザーは自動的にログアウトされる
- リフレッシュトークンは Redis に jti で管理されるため、Redis flush は不要
- ゼロダウンタイムが必要な場合: dual-key 方式（移行期間内に旧鍵も受け付ける）を検討

---

## 2. DB パスワードのローテーション (PostgreSQL)

### 手順

```bash
# 1. 新しいパスワードを生成
NEW_PW=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

# 2. DB ユーザーのパスワードを変更
psql -U postgres -c "ALTER USER servicehub_user PASSWORD '$NEW_PW';"

# 3. 接続文字列を更新
# DATABASE_URL=postgresql+asyncpg://servicehub_user:NEW_PW@db:5432/servicehub
gh secret set DATABASE_URL --body "postgresql+asyncpg://servicehub_user:${NEW_PW}@db:5432/servicehub"

# 4. アプリを再起動
docker compose up -d --no-deps backend

# 5. 接続確認
curl http://localhost:8000/health/ready
```

### pgBouncer / 接続プール使用時

pgBouncer の `userlist.txt` も同時に更新する必要がある。

---

## 3. Redis パスワードのローテーション

### 手順

```bash
# 1. 新しいパスワードを生成
NEW_PW=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

# 2. Redis サーバーのパスワードを変更 (AUTH コマンド + CONFIG REWRITE)
redis-cli -a "$OLD_REDIS_PASSWORD" CONFIG SET requirepass "$NEW_PW"
redis-cli -a "$NEW_PW" CONFIG REWRITE

# 3. 接続 URL を更新
# REDIS_URL=redis://:NEW_PW@redis:6379/0
gh secret set REDIS_URL --body "redis://:${NEW_PW}@redis:6379/0"

# 4. アプリを再起動
docker compose up -d --no-deps backend

# 5. ping 確認
curl http://localhost:8000/health/ready
```

---

## 4. OpenAI API キーのローテーション

### 手順

1. [OpenAI Platform](https://platform.openai.com/api-keys) で新しい API キーを発行
2. 旧キーは **削除前に** 新キーをアプリに反映してから削除

```bash
gh secret set OPENAI_API_KEY --body "sk-proj-..."
docker compose up -d --no-deps backend
# 旧キーを OpenAI コンソールから無効化・削除
```

---

## 5. MinIO アクセスキーのローテーション

```bash
# MinIO コンソール (http://minio:9001) でアクセスキーを生成
# または mc コマンドを使用:
mc alias set local http://minio:9000 "$OLD_ACCESS_KEY" "$OLD_SECRET_KEY"
mc admin user add local servicehub_user "$NEW_SECRET_KEY"
mc admin policy attach local readwrite --user servicehub_user

gh secret set MINIO_ACCESS_KEY --body "servicehub_user"
gh secret set MINIO_SECRET_KEY --body "$NEW_SECRET_KEY"
docker compose up -d --no-deps backend
# 旧ユーザー/キーを削除
mc admin user remove local old_servicehub_user
```

---

## 6. ローテーション実施ログ

ローテーション実施後に以下のテーブルを更新する (監査証跡)。

| 実施日 | 種別 | 担当者 | 確認者 | 備考 |
|---|---|---|---|---|
| YYYY-MM-DD | JWT_SECRET | - | - | 初回設定 |

---

## 7. 緊急ローテーション (漏洩検知時)

```bash
# 1. 即座にシークレットを無効化 (GitHub Secrets から削除 or 上書き)
# 2. 新シークレットを生成して適用
# 3. 影響を受けたセッションを Redis でフラッシュ
redis-cli -a "$REDIS_PASSWORD" FLUSHDB  # 全 refresh token を無効化
# 4. インシデントレポートを作成 (GitHub Issue)
gh issue create --title "[SECURITY] Secret Rotation — 漏洩対応" \
  --label "security,incident" \
  --body "実施日時: $(date -u)\n種別: \n影響範囲: \n対応者: "
```
