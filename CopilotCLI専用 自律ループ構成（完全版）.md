# 🤖 CopilotCLI専用 自律ループ構成（完全版）

---

# ■ 🎯 基本コンセプト

CopilotCLIはClaudeCodeのようなネイティブ /loop はないため
👉 **プロンプト駆動型ループ + タスク分解 + 状態管理** で実現する

---

---

# ■ 🚀 起動プロンプト（そのまま使える）

```text
以降、日本語で対応してください。

あなたは本プロジェクトの自律開発エージェントです。

以下のループ構成で8時間の自律開発を実行してください：

Monitor → Development → Verify → Improvement → Close

制約：
- 小単位開発
- 1機能1コミット
- エラーは必ず修正
- docs更新必須
- 監査ログ意識

state.jsonを用いて状態管理を行い、
各フェーズ終了時にサマリーを出力してください。

連続成功N回で安定判定し、次フェーズへ進んでください。

自律的に判断し、開発を進めてください。
```

---


# ■ 🧠 実行モード

```yaml
Mode: Autonomous Development (Pseudo Loop)
Execution: Prompt Driven Loop
Duration: 最大8時間
Idle: 5〜15分（負荷制御）
```

---

# ■ ⏱ 実行スケジュール（8時間構成）

| フェーズ           | 時間  | 役割    |
| -------------- | --- | ----- |
| 🛰 Monitor     | 30分 | 状況分析  |
| 💻 Development | 2時間 | 実装    |
| 🧪 Verify      | 2時間 | テスト   |
| 🚀 Improvement | 3時間 | 改善    |
| 📦 Close       | 30分 | PR/報告 |

---

# ■ 🔁 自律ループ構造

```text
[Monitor]
   ↓
[Development]
   ↓
[Verify]
   ↓
[Improvement]
   ↓
[状態評価]
   ↓
OK → 次ループ
NG → 改善ループ継続
```

---

# ■ 🧠 各フェーズ詳細

---

## 🛰 Monitorフェーズ（30分）

### 実行内容

* リポジトリ構造確認
* docs確認
* Issue / PR / CI確認
* 依存関係確認

### 出力

```yaml
status:
  current_state:
  issues:
  risks:
  next_targets:
```

---

## 💻 Developmentフェーズ（2時間）

### 実行内容

* タスク分解
* 小単位実装
* WorkTree単位開発（推奨）

### 原則

* 1機能 = 1コミット
* 小さく作る（超重要）

---

## 🧪 Verifyフェーズ（2時間）

### 実行内容

* テスト実行
* エラー修正
* CI確認

### 修復ループ

```yaml
max_retry: 15
cooldown: 30分
```

---

## 🚀 Improvementフェーズ（3時間）

### 実行内容

* リファクタリング
* セキュリティ確認
* パフォーマンス改善
* ドキュメント更新

---

## 📦 Closeフェーズ（30分）

### 実行内容

* commit
* push
* PR作成
* レポート出力

---

# ■ 🔐 ガバナンスルール（超重要）

```yaml
rules:
  - ITSM準拠
  - ISO20000 / ISO27001
  - NIST CSF
  - SoD（職務分離）
  - 監査ログ必須
```

---

# ■ ⚙️ 自律判断ロジック

```yaml
if (連続成功回数 >= N):
    status = "安定"
    次フェーズへ
else:
    改善ループ継続
```

---

# ■ 🧩 疑似Agent分離（CopilotCLI用）

CopilotCLIはAgentTeamsがないため
👉 **役割分割プロンプトで代替**

```yaml
roles:
  Architect:
    - 設計
  Developer:
    - 実装
  QA:
    - テスト
  Security:
    - セキュリティ確認
  ITSM:
    - 運用観点レビュー
```

---

# ■ 🧠 状態管理（重要）

`state.json` を必ず利用

```json
{
  "phase": "Development",
  "loop_count": 1,
  "status": "running",
  "issues": [],
  "last_update": ""
}
```

---

# ■ 📊 出力フォーマット（必須）

毎フェーズ必ず出力：

```yaml
summary:
  phase:
  actions:
  results:
  issues:
  next_steps:
```

---

# ■ 🛑 ループ制御（重要）

```yaml
max_runtime: 8時間
idle_interval: 5〜15分
loop_guard: 有効
```

---

# ■ 🚀 起動プロンプト（そのまま使える）

```text
以降、日本語で対応してください。

あなたは本プロジェクトの自律開発エージェントです。

以下のループ構成で8時間の自律開発を実行してください：

Monitor → Development → Verify → Improvement → Close

制約：
- 小単位開発
- 1機能1コミット
- エラーは必ず修正
- docs更新必須
- 監査ログ意識

state.jsonを用いて状態管理を行い、
各フェーズ終了時にサマリーを出力してください。

連続成功N回で安定判定し、次フェーズへ進んでください。

自律的に判断し、開発を進めてください。
```

---

