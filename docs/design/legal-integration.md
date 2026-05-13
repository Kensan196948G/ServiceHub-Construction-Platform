# 📜 Claude for Legal 統合 — 設計メモ

> **Status**: Draft v0.1 (2026-05-13)
> **Owner**: CTO (under ClaudeOS v9.0)
> **Epic**: [#225](https://github.com/Kensan196948G/ServiceHub-Construction-Platform/issues/225)
> **Reference**: [anthropics/claude-for-legal](https://github.com/anthropics/claude-for-legal) (Apache 2.0)

## 📌 1. 目的

[anthropics/claude-for-legal](https://github.com/anthropics/claude-for-legal) のパターンを **建設業向け Legal Tech 拡張** として ServiceHub Construction Platform に統合する。

ターゲット法令:

| 法令 | 主な責務 |
|---|---|
| 建設業法 | 元請・下請契約書面要件、一括下請負禁止、技術者配置義務、帳簿備付け |
| 下請代金支払遅延等防止法（下請法） | 60 日支払期限、書面交付義務、不当減額禁止 |
| 労働安全衛生法 | 安全管理者選任、リスクアセスメント、災害報告 |
| 公共工事入札契約適正化法 (Phase 4) | 入札書類、競合分析 |

## 🗺️ 2. 全体アーキテクチャ

```mermaid
flowchart TB
    Client[Frontend / Mobile] -->|HTTPS| API[FastAPI Router]
    API --> Legal[/api/v1/legal/*]
    API --> Existing[/api/v1/projects /itsm etc/]

    Legal --> ContractAI[Contract AI Service]
    Legal --> ComplianceAI[Compliance AI Service]
    Legal --> EvidenceSvc[Evidence Timeline Service]
    Legal --> Search[Legal Search RAG]

    ContractAI -->|claude-opus-4-7| Anthropic[(Anthropic API)]
    ComplianceAI -->|claude-opus-4-7| Anthropic
    Search -->|embedding| Anthropic
    Search -->|kNN| PGVector[(pgvector / Postgres)]

    Legal --> DB[(PostgreSQL)]
    Existing --> DB
    EvidenceSvc --> Audit[Audit Log Sink]
```

## 🌐 3. API 命名規約

### 新規 5 モジュール（Phase 1〜4）

| Path | 役割 | Phase |
|---|---|---|
| `/api/v1/legal/contracts/*` | 契約管理 + AI 解析 | 1 |
| `/api/v1/legal/compliance/*` | コンプライアンスチェック | 2 |
| `/api/v1/legal/evidence/*` | 証跡タイムライン | 2 |
| `/api/v1/legal/tender/*` | 入札書類自動生成 | 4 |
| `/api/v1/legal/search/*` | 法令・判例検索 (RAG) | 4 |

### 既存モジュール強化（sub-resource パターン）

```
/api/v1/projects/{id}/legal-risks
/api/v1/projects/{id}/contracts
/api/v1/itsm/incidents/legal
/api/v1/itsm/incidents/{id}/escalate
/api/v1/daily-reports/{id}/evidence    (Phase 2)
/api/v1/safety/audits/{id}/violations  (Phase 2)
/api/v1/costs/{id}/subcontract-check   (Phase 3)
```

### 認可

- 全 `/api/v1/legal/*` は `Depends(get_legal_admin_user)` で権限分離
- 既存モジュール強化部分は既存 `get_current_active_user` + 個別 role チェック

## 📊 4. データモデル方針

### 4.1 Contract (Phase 1)

```python
class Contract(Base):
    id: UUID
    project_id: UUID         # FK
    type: ContractType       # PRIME / SUB
    parties: dict            # JSONB: 当事者情報
    period_start: date
    period_end: date
    amount: Decimal
    ai_risk_score: RiskLevel  # CRITICAL / HIGH / MEDIUM / LOW
    ai_analysis_json: dict    # Claude 解析結果（条項抽出・リスク根拠）
    document_url: str | None  # PDF/Word ストレージ URL
```

### 4.2 ComplianceCheck (Phase 2)

```python
class ComplianceCheck(Base):
    id: UUID
    target_type: str        # contract / daily_report / safety_audit / cost / ...
    target_id: UUID
    law: ComplianceLaw      # construction_law / subcontract_law / labor_safety_law
    violation_type: str
    severity: RiskLevel
    evidence_refs: list[UUID]   # EvidenceTimeline ID list
    detected_at: datetime
    resolved_at: datetime | None
    resolution_notes: str | None
```

### 4.3 EvidenceTimeline (Phase 2)

```python
class EvidenceTimeline(Base):
    """改ざん検知付き時系列証跡。Merkle ライクに prev_hash でチェイン化。"""
    id: UUID
    resource_type: str       # daily_report / photo / contract / ...
    resource_id: UUID
    event_type: str          # created / updated / signed / approved / ...
    payload_hash: str        # SHA-256 of event payload
    prev_hash: str | None    # 前イベントの payload_hash（チェイン）
    timestamp: datetime
    actor_id: UUID
    metadata: dict           # JSONB
```

### 4.4 LegalDocumentEmbedding (Phase 4 / pgvector)

```python
class LegalDocumentEmbedding(Base):
    id: UUID
    doc_id: UUID
    chunk_id: int
    embedding: Vector(1536)  # pgvector
    text: str
    doc_type: str            # law / precedent / internal_policy
    metadata: dict
```

## 🤖 5. Claude API 利用方針

| 用途 | モデル | 入力上限 | 出力形式 |
|---|---|---|---|
| 契約条項抽出 (Phase 1) | claude-opus-4-7 | 200K tokens | JSON schema 強制 |
| コンプライアンスチェック (Phase 2) | claude-opus-4-7 | 200K tokens | JSON schema 強制 |
| 証跡の自然言語要約 (Phase 2) | claude-haiku-4-5 (低コスト) | 200K | Markdown |
| 法令検索 RAG (Phase 4) | claude-opus-4-7 + embedding | RAG context 50K | Markdown |

### 共通サービス層

- `app/services/legal/anthropic_client.py` — シングルトン Anthropic クライアント
- `app/services/legal/prompts/` — 法令別システムプロンプト（条文埋め込み）
- `app/services/legal/risk_scoring.py` — CRITICAL/HIGH/MEDIUM/LOW のしきい値ルール

## ⚖️ 6. リスクスコアリング規則

| Level | 定義 | 例 |
|---|---|---|
| **CRITICAL** | 即時是正必須。法令違反確定 or データ消失リスク | 下請法 60 日超過、安全管理者不在で災害発生 |
| **HIGH** | 24 時間以内対応必須。違反の蓋然性高 | 契約書面要件未充足、技術者配置不備 |
| **MEDIUM** | 1 週間以内対応推奨 | 書面交付の不備、軽微な記載漏れ |
| **LOW** | 情報提供のみ | ベストプラクティス逸脱、推奨事項未充足 |

CRITICAL 検出時は自動的に ITSM Incident 起票 + 法務担当エスカレーション（→ #227）。

## 🔁 7. 既存モジュール強化マッピング

| 既存 | 強化内容 | Phase | 主リファレンス Issue |
|---|---|---|---|
| `routers/projects.py` | 契約紐付け + 工期遅延法的リスク評価 | 1 | #228 |
| `routers/itsm.py` | 法令違反インシデント + エスカレーション | 1 | #227 |
| `routers/daily_reports.py` | 証跡化 + 改ざん検知ハッシュ | 2 | TBD |
| `routers/safety.py` | 労働安全衛生法 違反自動検知 | 2 | TBD |
| `routers/costs.py` | 下請法 60 日支払期限チェック | 3 | TBD |
| `routers/knowledge.py` | 法令ナレッジ統合 | 3 | TBD |
| `routers/notifications.py` | 法的アラート（期限・違反） | 3 | TBD |
| `routers/photos.py` | 写真証跡メタデータ（位置/時刻/ハッシュ） | 3 | TBD |
| `routers/dashboard.py` | リーガルリスク可視化ウィジェット | 3 | TBD |

## 🔐 8. セキュリティ・監査要件

- **暗号化**: at-rest (PostgreSQL TDE / 列レベルで Contract.ai_analysis_json も対象)、in-transit (TLS 1.3+)
- **アクセス制御**: 法務担当・経営層・現場管理者 で RBAC 分離（Phase 1 で legal_admin / legal_officer role 追加）
- **Audit-Agent**: 全 `/api/v1/legal/*` リクエストを監査ログ収集（Audit-Agent が Phase 完了ごとに ISO 27001 / J-SOX 整合確認）
- **Codex 対抗レビュー必須**: DB スキーマ変更 + 認可変更が発生する Phase 1 / Phase 2 では `/codex:adversarial-review` を必須化

## 📅 9. ロードマップ

| Phase | 期間 | 範囲 | 子 Issue |
|---|---|---|---|
| 1 (P1) | W1–3 (2026-05-14〜06-03) | contracts.py 新設 + projects.py / itsm.py 強化 | #226, #228, #227 (起票予定) |
| 2 (P2) | W4–6 (2026-06-04〜06-24) | evidence.py + compliance.py 新設 + daily_reports.py / safety.py 強化 | Phase 1 完了時起票 |
| 3 (P3) | W7–10 (2026-06-25〜07-29) | costs.py / knowledge.py / notifications.py / photos.py / dashboard.py 強化 | Phase 2 完了時起票 |
| 4 (P4) | W11–12 (2026-07-30〜08-12) | tender.py + search.py 新設 (pgvector RAG) | Phase 3 完了時起票 |

## ✅ 10. 受入れ基準（設計メモとして）

このメモは **Living Document** として扱い、各 Phase 完了時に更新する。

- [ ] Phase 1 完了時: 契約モデル・命名規約の検証実績を反映
- [ ] Phase 2 完了時: 証跡チェインの実装詳細を反映
- [ ] Phase 4 完了時: pgvector スキーマ最終版を反映

## 📚 11. 参考

- [anthropics/claude-for-legal](https://github.com/anthropics/claude-for-legal)
- 建設業法 (e-Gov)
- 下請代金支払遅延等防止法 (公正取引委員会)
- 労働安全衛生法 (厚生労働省)
- 公共工事入札契約適正化法 (国土交通省)
- 関連 Issue: #225 (Epic), #226 / #227 / #228 (Phase 1 子 Issue)
