# はじめに — ServiceHub Construction Platform

5 分でセットアップして最初のログインまで到達するガイドです。

## 前提条件

| ツール | バージョン |
|---|---|
| Docker Engine | 24.0 以上 |
| Docker Compose | 2.x 以上 |
| (任意) curl / httpie | 動作確認用 |

## ステップ 1: リポジトリ取得

```bash
git clone https://github.com/Kensan196948G/ServiceHub-Construction-Platform.git
cd ServiceHub-Construction-Platform
```

## ステップ 2: 環境変数の設定

```bash
cp .env.example .env
# .env を開き、以下の項目を確認・変更する
# JWT_SECRET_KEY= (ランダム文字列に変更)
# OPENAI_API_KEY= (AI検索を使用する場合)
```

> **セキュリティ注意**: `.env` をコミットしないでください。`.gitignore` に含まれています。

## ステップ 3: サービス起動

```bash
docker compose up -d
```

初回はイメージビルドのため 2〜5 分かかります。

## ステップ 4: 起動確認

```bash
curl http://localhost/health/live
# {"status": "alive"} が返れば OK
```

ブラウザで `http://localhost` を開くとログイン画面が表示されます。

## ステップ 5: 初回ログイン

| 項目 | 値 |
|---|---|
| メールアドレス | `admin@servicehub.example` |
| パスワード | `.env` 内の `INITIAL_ADMIN_PASSWORD` |

> **本番環境**: 初回ログイン後に必ずパスワードを変更してください。

## 次のステップ

- [工事案件管理ガイド](construction-projects.md) — 案件の作成・管理
- [管理者設定ガイド](admin-guide.md) — ユーザー・権限設定
- [API 仕様](../09_API仕様（API%20Specifications）/) — プログラムから操作する場合
- [デプロイメントガイド](../deployment/kubernetes.md) — Kubernetes 環境への展開

## トラブルシューティング

**サービスが起動しない場合**

```bash
docker compose logs backend --tail 50
```

**データベース接続エラー**

```bash
docker compose restart db
docker compose run --rm backend alembic upgrade head
```

**ポート競合**

`.env` で `BACKEND_PORT`, `FRONTEND_PORT` を変更後に再起動してください。
