# 社内リリース計画

## 概要

本計画書は、ServiceHub Construction Platform の社内リリース（2026年10月2日）に向けたリリース手順・ロールバック計画・告知スケジュール・サポート体制を定義する。

---

## リリーススケジュール

| 日時 | 作業内容 | 担当 |
|-----|---------|------|
| 2026/09/25（木） | ソフトランチ開始（一部ユーザー） | 開発・運用チーム |
| 2026/09/28（日）22:00 | 本番環境最終デプロイ・設定確認 | 開発チーム |
| 2026/09/29（月）08:00 | 全社告知メール配信 | PM |
| 2026/10/01（木）09:00 | リリース前最終確認 | 開発・運用チーム |
| 2026/10/02（金）09:00 | 正式リリース・全社公開 | 全チーム |
| 2026/10/02（金）17:00 | リリース完了報告 | PM |

---

## デプロイ手順

### 事前準備（リリース1週間前）
```bash
# 本番環境の設定確認
kubectl get pods -n production
kubectl get services -n production

# データベースバックアップ
pg_dump -Fc -U servicehub_user servicehub > prod_backup_20261001.dump

# DNSの確認
dig servicehub.internal

# SSL証明書の確認
openssl s_client -connect servicehub.internal:443 -showcerts
```

### デプロイ実行手順

```bash
# 1. メンテナンスモード開始
kubectl apply -f k8s/maintenance-mode.yaml

# 2. 最新イメージを本番にデプロイ
kubectl set image deployment/backend \
  backend=registry.internal/servicehub-backend:v1.0.0 -n production
kubectl set image deployment/frontend \
  frontend=registry.internal/servicehub-frontend:v1.0.0 -n production

# 3. DBマイグレーション実行
kubectl exec -it deployment/backend -n production -- alembic upgrade head

# 4. ヘルスチェック確認
kubectl rollout status deployment/backend -n production
kubectl rollout status deployment/frontend -n production

# 5. スモークテスト実施
curl -f https://servicehub.internal/health || exit 1

# 6. メンテナンスモード解除
kubectl delete -f k8s/maintenance-mode.yaml
```

---

## ロールバック計画

### ロールバックトリガー条件

| 条件 | 判断者 | 対応 |
|-----|-------|------|
| P1バグの発生 | 開発リード・PM | 即時ロールバック |
| エラー率 > 5% | 運用チーム | 30分以内にロールバック検討 |
| レスポンス時間 > 5秒（P95） | 運用チーム | 1時間以内に判断 |
| データ整合性エラー | 開発リード | 即時ロールバック |

### ロールバック手順

```bash
# アプリケーションのロールバック
kubectl rollout undo deployment/backend -n production
kubectl rollout undo deployment/frontend -n production

# DBマイグレーションのロールバック（必要に応じて）
kubectl exec -it deployment/backend -n production -- alembic downgrade -1

# ロールバック確認
kubectl rollout status deployment/backend -n production
curl -f https://servicehub.internal/health
```

---

## リリース告知

### 全社告知メール（テンプレート）

```
件名: 【重要】ServiceHub Construction Platform リリースのお知らせ（2026/10/02）

各位

お世話になっております。
プロジェクト推進部 ○○です。

この度、建設業向けAI統合業務プラットフォーム「ServiceHub Construction Platform」を
2026年10月2日（金）より社内利用開始いたします。

【主な機能】
・工事案件管理（案件の作成・進捗管理）
・日報管理（日報作成・承認フロー）
・写真・資料管理
・安全品質管理
・原価・工数管理
・AI支援機能（日報補完・チャットボット）

【アクセス先】
URL: https://servicehub.internal

【利用開始前の準備】
・ユーザーアカウントを事前に各部門管理者より配布します
・ご不明な点はヘルプデスク（ext.1234）までご連絡ください

以上、よろしくお願いいたします。
```

---

## サポート体制

| サポート区分 | 対応内容 | 連絡先 | 対応時間 |
|-----------|---------|-------|---------|
| ヘルプデスク | 操作方法・一般的な問い合わせ | ext.1234 / helpdesk@company.com | 平日 8:00〜18:00 |
| 障害対応 | システム障害・緊急対応 | 緊急連絡先（リスト配布） | 24時間対応（P1のみ） |
| 管理者サポート | 権限管理・設定変更 | IT部門 ext.1235 | 平日 9:00〜17:00 |

---

## リリース後モニタリング計画

| 期間 | モニタリング強度 | 確認事項 |
|-----|-------------|---------|
| リリース直後72時間 | 強化監視（1時間毎確認） | エラー率・レスポンス時間・サーバーリソース |
| リリース後1週間 | 通常監視 + 日次確認 | バグ報告・ユーザーフィードバック |
| リリース後1ヶ月 | 通常監視 | KPI達成状況・改善要望 |
