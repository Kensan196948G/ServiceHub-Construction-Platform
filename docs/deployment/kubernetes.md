# Kubernetes デプロイメントガイド — ServiceHub Construction Platform

## 概要

ServiceHub は Helm chart (`charts/servicehub/`) で Kubernetes クラスタへデプロイできます。
Docker Compose（開発・ステージング）と並行する本番マイグレーションパスとして提供します。

## 前提条件

| ツール | バージョン | 用途 |
|---|---|---|
| kubectl | >= 1.29 | クラスタ操作 |
| helm | >= 3.14 | チャート管理 |
| Docker | 任意 | イメージビルド |
| k8s クラスタ | >= 1.29 | デプロイ先（EKS/GKE/AKS/kind） |

## アーキテクチャ

```
Ingress (nginx)
    ├── /         → frontend (Next.js, port 3000)
    ├── /api      → backend  (FastAPI,  port 8000)
    └── /docs     → backend  (FastAPI OpenAPI)

backend ──── PostgreSQL (Bitnami subchart, port 5432)
         └── Redis      (Bitnami subchart, port 6379)
```

## クイックスタート

### 1. 依存チャートのダウンロード

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm dependency update charts/servicehub/
```

### 2. lint 確認

```bash
helm lint charts/servicehub/ --strict
```

### 3. シークレット準備

```bash
# 本番では sealed-secrets または external-secrets-operator を推奨
JWT_SECRET=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -hex 16)
```

### 4. インストール

```bash
helm install servicehub charts/servicehub/ \
  --namespace servicehub \
  --create-namespace \
  --set backend.secret.jwtSecretKey="${JWT_SECRET}" \
  --set backend.secret.databaseUrl="postgresql+asyncpg://servicehub:${DB_PASSWORD}@servicehub-postgresql:5432/servicehub_db" \
  --set backend.secret.redisUrl="redis://servicehub-redis-master:6379/0" \
  --set postgresql.auth.password="${DB_PASSWORD}" \
  --set ingress.hosts[0].host="servicehub.yourdomain.com" \
  --wait
```

### 5. マイグレーション実行

```bash
kubectl exec -n servicehub deploy/servicehub-backend -- alembic upgrade head
```

## 環境別値ファイル

```bash
# ステージング
helm upgrade --install servicehub charts/servicehub/ \
  -f charts/servicehub/values.yaml \
  -f values-staging.yaml \
  --namespace servicehub-staging

# 本番
helm upgrade --install servicehub charts/servicehub/ \
  -f charts/servicehub/values.yaml \
  -f values-production.yaml \
  --namespace servicehub
```

### values-production.yaml の例

```yaml
backend:
  replicaCount: 3
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 20

frontend:
  replicaCount: 3
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 8

postgresql:
  primary:
    persistence:
      size: 50Gi

ingress:
  hosts:
    - host: servicehub.yourdomain.com
      paths:
        - path: /api
          pathType: Prefix
          service: backend
        - path: /docs
          pathType: Prefix
          service: backend
        - path: /
          pathType: Prefix
          service: frontend
  tls:
    - secretName: servicehub-tls
      hosts:
        - servicehub.yourdomain.com
```

## HPA (水平スケール)

| コンポーネント | min | max | CPU閾値 |
|---|---|---|---|
| backend | 2 | 10 | 70% |
| frontend | 2 | 6 | 70% |

```bash
# HPA 状態確認
kubectl get hpa -n servicehub
```

## 操作コマンド

```bash
# ステータス確認
helm status servicehub -n servicehub
kubectl get all -n servicehub

# ログ確認
kubectl logs -n servicehub -l app.kubernetes.io/component=backend -f

# ロールバック
helm rollback servicehub 0 -n servicehub  # 0 = 1つ前のリビジョン

# アンインストール
helm uninstall servicehub -n servicehub
```

## ローカル検証 (kind)

```bash
# kind クラスタ作成
kind create cluster --name servicehub-dev

# ingress-nginx インストール
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# デプロイ
helm install servicehub charts/servicehub/ \
  --set backend.secret.jwtSecretKey="dev-secret" \
  --set backend.secret.databaseUrl="postgresql+asyncpg://servicehub:pass@servicehub-postgresql:5432/servicehub_db" \
  --set backend.secret.redisUrl="redis://servicehub-redis-master:6379/0" \
  --set postgresql.auth.password="pass" \
  --set ingress.hosts[0].host="localhost"
```

## セキュリティ

- backend コンテナは `readOnlyRootFilesystem: true` + `runAsNonRoot: true`
- シークレットは `helm install --set` ではなく sealed-secrets / ESO を本番推奨
- RBAC は `Role` + `RoleBinding`（namespace スコープ）のみ付与
- HPA の scaleDown には 5 分の stabilization window を設定（フラッピング防止）

## CI/CD 統合

GitHub Actions で `helm-lint.yml` が以下を自動実行:

1. `helm lint --strict`
2. `helm template` でマニフェスト生成
3. `kubeconform` で Kubernetes API バリデーション
4. 生成マニフェストを artifact アップロード
