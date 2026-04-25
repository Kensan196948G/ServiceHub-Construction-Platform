# ServiceHub Construction Platform — ロールバック手順書

## 概要

本ドキュメントは、staging/production 環境でデプロイに問題が発生した場合のロールバック手順を定義する。

---

## 1. 前提

| 項目 | 内容 |
|---|---|
| コンテナレジストリ | `ghcr.io/kensan196948g/servicehub-construction-platform/` |
| DB マイグレーション | Alembic (backend/alembic/) |
| 環境変数 | GitHub Secrets / `.env.staging` |
| ロールバックの最小単位 | 1 マイナーリリース (semver) または 1 PR |

---

## 2. Docker イメージの切り戻し

### 2.1 前バージョンのタグを確認

```bash
# ghcr.io のイメージ一覧確認
gh api /orgs/Kensan196948G/packages/container/servicehub-construction-platform%2Fbackend/versions \
  --jq '.[].metadata.container.tags[]' | head -20
```

### 2.2 前バージョンのイメージでサービスを再起動

```bash
# 前バージョンのタグを指定 (例: sha-abc1234 または v1.2.3)
export PREV_TAG="sha-abc1234"

# docker-compose.staging.yml でイメージタグを上書き
IMAGE_TAG=$PREV_TAG docker compose -f docker-compose.staging.yml up -d --no-build
```

### 2.3 ヘルスチェック確認

```bash
BASE_URL=https://staging.servicehub.example.com ./scripts/smoke-test.sh
```

---

## 3. DB マイグレーションのロールバック

### 3.1 現在のリビジョン確認

```bash
docker compose -f docker-compose.staging.yml exec api alembic current
```

### 3.2 1 リビジョン戻す

```bash
docker compose -f docker-compose.staging.yml exec api alembic downgrade -1
```

### 3.3 特定リビジョンまで戻す

```bash
# alembic history でリビジョン一覧を確認
docker compose -f docker-compose.staging.yml exec api alembic history --verbose

# 特定リビジョンまでダウングレード
docker compose -f docker-compose.staging.yml exec api alembic downgrade <revision_id>
```

> **注意**: データの不可逆な変更（カラム削除・テーブル削除）を含む migration は、
> ダウングレード前にデータバックアップを必ず取得すること。

---

## 4. 完全ロールバック手順 (緊急時)

1. **現バージョンのサービスを停止**
   ```bash
   docker compose -f docker-compose.staging.yml down
   ```

2. **DB バックアップから復元** (DDL 変更を含む場合)
   ```bash
   # 事前に取得したバックアップから復元
   docker compose -f docker-compose.staging.yml run --rm db \
     psql -U servicehub servicehub_staging < /backup/pre-deploy-backup.sql
   ```

3. **前バージョンのイメージを起動**
   ```bash
   IMAGE_TAG=$PREV_TAG docker compose -f docker-compose.staging.yml up -d
   ```

4. **Smoke test で確認**
   ```bash
   BASE_URL=https://staging.servicehub.example.com ./scripts/smoke-test.sh
   ```

5. **Issue を起票して原因を追跡**
   - ラベル: `P1`, `bug`, `deployment`
   - 本文: 発生時刻・症状・実施したロールバック手順・次のアクション

---

## 5. デプロイ前チェックリスト

デプロイ前に以下を確認すること。

- [ ] `alembic upgrade head` が冪等 (再実行しても安全) であることを確認
- [ ] breaking な DB 変更がある場合は、old/new コードの互換性を確認
- [ ] `docker compose config` でyaml構文エラーがないことを確認
- [ ] `.env.staging` の secrets が最新であることを確認
- [ ] 直前の main ブランチの CI が全 green であることを確認

---

## 6. 連絡先・エスカレーション

| 役割 | 対応内容 |
|---|---|
| DevOps | CI/CD パイプライン障害 |
| Backend Developer | DB migration / API エラー |
| Frontend Developer | 静的ファイル配信・SPA ルーティング問題 |
| CTO | 全体判断・本番ロールバック最終決定 |
