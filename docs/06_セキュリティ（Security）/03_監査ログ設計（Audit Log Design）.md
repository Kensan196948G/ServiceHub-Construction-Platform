# 監査ログ設計（Audit Log Design）

## 1. 監査ログの目的

| 目的 | 内容 |
|------|------|
| コンプライアンス | 法令・規格（建設業法/ISO27001）への対応 |
| セキュリティ | 不正アクセス・データ改ざんの検出 |
| 操作追跡 | 誰が・いつ・何を操作したかの追跡 |
| 否認防止 | 操作の事実を証明する証跡の保持 |
| フォレンジック | インシデント発生時の原因調査 |

---

## 2. 監査ログ対象操作

### 記録必須操作

| カテゴリ | 操作 | 記録内容 |
|---------|------|---------|
| 認証 | ログイン成功/失敗 | ユーザーID, IP, User-Agent, 結果 |
| 認証 | ログアウト | ユーザーID, セッション時間 |
| 認証 | パスワード変更 | ユーザーID, 変更日時 |
| 認証 | MFA設定/無効化 | ユーザーID, 操作 |
| データ操作 | CRUD操作（全テーブル） | テーブル名, レコードID, 変更前後値 |
| 権限管理 | ロール付与/剥奪 | 対象ユーザー, ロール, 操作者 |
| ファイル操作 | ファイルアップロード/削除 | ファイル名, サイズ, 操作者 |
| エクスポート | データエクスポート | エクスポート種別, 件数, 操作者 |
| 管理操作 | ユーザー作成/削除 | 対象ユーザーID, 操作者 |
| 管理操作 | システム設定変更 | 設定項目, 変更前後値, 操作者 |

---

## 3. 監査ログテーブル設計

```sql
CREATE TABLE audit_logs (
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    action_time     TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- 誰が
    user_id         UUID,
    username        VARCHAR(64),
    user_role       VARCHAR(32),
    ip_address      INET,
    user_agent      TEXT,
    session_id      UUID,
    
    -- 何を
    action          VARCHAR(32) NOT NULL,
    -- 'LOGIN', 'LOGOUT', 'CREATE', 'READ', 'UPDATE', 'DELETE',
    -- 'EXPORT', 'UPLOAD', 'PERMISSION_CHANGE', 'CONFIG_CHANGE'
    
    resource_type   VARCHAR(64),  -- テーブル名/リソース種別
    resource_id     UUID,         -- 操作対象のID
    
    -- どのように
    old_values      JSONB,        -- 変更前の値（UPDATE/DELETE時）
    new_values      JSONB,        -- 変更後の値（CREATE/UPDATE時）
    metadata        JSONB,        -- 追加情報（検索条件、エクスポート件数等）
    
    -- 結果
    result          VARCHAR(16) NOT NULL DEFAULT 'success',
    -- 'success', 'failure', 'partial'
    error_message   TEXT,
    
    -- 所属情報（パーティショニング用）
    -- 月次パーティション
) PARTITION BY RANGE (action_time);

-- インデックス
CREATE INDEX ON audit_logs(user_id, action_time DESC);
CREATE INDEX ON audit_logs(action, action_time DESC);
CREATE INDEX ON audit_logs(resource_type, resource_id);
CREATE INDEX ON audit_logs(ip_address);

-- 月次パーティション（自動作成）
CREATE TABLE audit_logs_2026_04 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE audit_logs_2026_05 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
-- ... 以降自動作成
```

---

## 4. 監査ログ実装（自動記録）

### ミドルウェアによる自動記録

```python
class AuditLogMiddleware:
    """全APIリクエストの監査ログを自動記録"""
    
    # 記録対象外（読み取り専用・低リスク）
    SKIP_PATHS = ["/health", "/metrics", "/docs"]
    SKIP_METHODS = {"GET", "HEAD", "OPTIONS"}  # 参照系は別途設定
    
    async def __call__(self, request: Request, call_next):
        # リクエスト前の情報収集
        start_time = time.time()
        
        response = await call_next(request)
        
        # 記録対象か判定
        if not self._should_audit(request):
            return response
        
        # 監査ログ記録（非同期キューに投入）
        await self.audit_queue.put(AuditEntry(
            action_time=datetime.utcnow(),
            user_id=request.state.user_id,
            username=request.state.username,
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent"),
            action=self._map_method_to_action(request.method),
            resource_type=self._extract_resource_type(request.url.path),
            result="success" if response.status_code < 400 else "failure",
            metadata={"path": str(request.url.path), "status_code": response.status_code},
        ))
        
        return response
```

### データ変更の自動追跡（SQLAlchemy Event）

```python
from sqlalchemy import event

def register_audit_events(mapper_class):
    """SQLAlchemyのCRUDイベントに監査ログを自動追加"""
    
    @event.listens_for(mapper_class, 'after_insert')
    def after_insert(mapper, connection, target):
        log_audit(
            action='CREATE',
            resource_type=target.__tablename__,
            resource_id=target.id,
            new_values=target.to_audit_dict(),
        )
    
    @event.listens_for(mapper_class, 'after_update')
    def after_update(mapper, connection, target):
        history = get_history(target)
        if history.changed:
            log_audit(
                action='UPDATE',
                resource_type=target.__tablename__,
                resource_id=target.id,
                old_values=history.old_values,
                new_values=history.new_values,
            )
    
    @event.listens_for(mapper_class, 'after_delete')
    def after_delete(mapper, connection, target):
        log_audit(
            action='DELETE',
            resource_type=target.__tablename__,
            resource_id=target.id,
            old_values=target.to_audit_dict(),
        )
```

---

## 5. ログ保管・保護

| 項目 | 設定 |
|------|------|
| 保管期間 | 7年間（建設業法要件） |
| 保管場所 | 専用のwrite-onlyログDB（別インスタンス） |
| 改ざん防止 | INSERT専用権限（UPDATE/DELETE禁止） |
| バックアップ | 月次でオフラインストレージにアーカイブ |
| アクセス権限 | 管理者・監査員のみ参照可能 |
| 個人情報マスキング | パスワード等センシティブ情報は自動マスキング |

---

## 6. 監査ログ検索・レポート

### 検索クエリ例

```sql
-- 特定ユーザーの操作履歴
SELECT action_time, action, resource_type, resource_id, result
FROM audit_logs
WHERE user_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  AND action_time >= '2026-06-01'
ORDER BY action_time DESC
LIMIT 100;

-- 特定レコードへの全操作
SELECT action_time, username, action, old_values, new_values
FROM audit_logs
WHERE resource_type = 'projects'
  AND resource_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
ORDER BY action_time;

-- ログイン失敗の多いIPアドレス
SELECT ip_address, COUNT(*) as failure_count
FROM audit_logs
WHERE action = 'LOGIN'
  AND result = 'failure'
  AND action_time >= NOW() - INTERVAL '1 day'
GROUP BY ip_address
HAVING COUNT(*) >= 5
ORDER BY failure_count DESC;
```

---

## 7. アラート設定

| アラート条件 | 閾値 | 通知先 |
|------------|------|--------|
| ログイン失敗集中 | 5回/分以上（同一IP） | セキュリティ担当 |
| 権限変更 | 発生時即時 | システム管理者 |
| 大量エクスポート | 1000件以上/回 | セキュリティ担当 |
| 深夜管理者操作 | 22:00〜6:00の管理者操作 | セキュリティ担当 |
| 削除操作集中 | 10件以上/分（同一ユーザー） | システム管理者 |
