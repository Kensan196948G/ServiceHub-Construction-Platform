# バックアップ設計

## 概要

本ドキュメントでは、ServiceHub Construction Platform のバックアップ設計を定義する。RTO/RPO目標を達成するためのバックアップ方針・手順・テスト計画を定める。

---

## RTO/RPO目標

| 指標 | 目標値 | 定義 |
|-----|--------|------|
| RTO（目標復旧時間） | P1障害: 2時間以内 | 障害発生からサービス復旧までの時間 |
| RPO（目標復旧ポイント） | 1時間以内のデータ損失 | 障害発生時点から遡れるデータの最大損失量 |

---

## バックアップ方針

| バックアップ種別 | 頻度 | 保管期間 | 保管場所 |
|-------------|------|---------|---------|
| PostgreSQL フルバックアップ | 日次（深夜2時） | 30日間 | オフサイトS3 |
| PostgreSQL 増分バックアップ（WAL） | 継続（15分ごと） | 7日間 | ローカル+S3 |
| MinIOデータバックアップ | 日次 | 90日間 | オフサイトS3 |
| Elasticsearchスナップショット | 日次 | 30日間 | S3 |
| Redisスナップショット | 時次 | 24時間 | ローカル |
| アプリケーション設定 | 変更時 | 無期限 | GitリポジトリEncrypted |

---

## バックアップ手順

### PostgreSQL フルバックアップ

```bash
#!/bin/bash
# /opt/scripts/backup_postgres.sh

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="servicehub_${BACKUP_DATE}.dump"
S3_BUCKET="s3://servicehub-backups/postgres"

# バックアップ実行
pg_dump -Fc \
  -U servicehub_user \
  -h localhost \
  servicehub > /backup/${BACKUP_FILE}

# バックアップの整合性確認
pg_restore --list /backup/${BACKUP_FILE} > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "バックアップ整合性確認: OK"
  
  # S3にアップロード
  aws s3 cp /backup/${BACKUP_FILE} ${S3_BUCKET}/${BACKUP_FILE}
  echo "S3アップロード完了: ${S3_BUCKET}/${BACKUP_FILE}"
  
  # 古いバックアップを削除（30日以上前）
  find /backup -name "*.dump" -mtime +30 -delete
else
  echo "エラー: バックアップファイルの整合性確認に失敗"
  exit 1
fi
```

### リストア手順

```bash
# 1. サービス停止
kubectl scale deployment backend --replicas=0

# 2. DBを復元
pg_restore -Fc \
  -U servicehub_user \
  -d servicehub \
  /backup/servicehub_20261001_020000.dump

# 3. マイグレーション確認
alembic current

# 4. サービス再起動
kubectl scale deployment backend --replicas=2
kubectl rollout status deployment/backend
```

---

## バックアップテスト計画

| テスト種別 | 頻度 | 内容 |
|---------|------|------|
| バックアップ整合性確認 | 毎日（自動） | pg_restoreの--listオプションで確認 |
| リストア訓練 | 月次 | テスト環境へのリストア動作確認 |
| DR訓練 | 四半期 | 本番同等環境でのフルリストア |

---

## 監視・アラート

| 監視項目 | アラート条件 |
|---------|-----------|
| バックアップ成功 | 24時間以内にバックアップがない場合 |
| バックアップサイズ | 前日比で50%以上の増減 |
| S3アップロード | アップロード失敗時 |
| WALアーカイブ遅延 | 1時間以上遅延した場合 |
