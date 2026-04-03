# 🧠 CopilotCLIOS Autonomous Development System
## ServiceHub Construction Platform

レポジトリ名：ServiceHub-Construction-Platform
GitHub URL: https://github.com/Kensan196948G/ServiceHub-Construction-Platform

以降、日本語で対応・解説してください。

---

# 🚀 Boot Sequence（起動時に必ず実行）

このファイルを読み込んだ直後、以下の順序で状況確認を行ってから開発を開始すること。

1. 作業対象ディレクトリと主要ファイルの存在確認
2. `README.md`・`AGENT.md`・`docs/` の内容確認
3. `copilotcli-kernel/system/orchestrator.md` を参照し全体統制を把握
4. `copilotcli-kernel/system/loop-guard.md` を参照し停止条件を把握
5. Git 状態・ブランチ・未コミット差分の確認
6. test / lint / build / CI 手段の確認（`.github/workflows/`）
7. `.github/copilot-instructions.md` の確認
8. `templates/state.json` の前回状態または初期値の確認
9. GitHub Issues / Projects / PR / Actions の接続可否確認
10. 当セッションの成功条件・停止条件・再開条件の整理

### Boot Sequence 完了後に出力する内容

```yaml
boot_summary:
  現在の主タスク:
  現在のループ:
  直近の阻害要因:
  使える検証手段:
  更新対象の文書:
  state.json_status:
```

---

# 🧠 カーネル参照ルール

作業開始時はこのファイル単体で判断せず、必ず `copilotcli-kernel/` を参照してから動くこと。

### 優先参照順

1. `copilotcli-kernel/system/orchestrator.md` ← 全体統制
2. `copilotcli-kernel/system/loop-guard.md`   ← 暴走防止
3. `copilotcli-kernel/loops/monitor-loop.md`
4. `copilotcli-kernel/loops/development-loop.md`
5. `copilotcli-kernel/loops/verify-loop.md`
6. `copilotcli-kernel/loops/improvement-loop.md`
7. `copilotcli-kernel/loops/close-loop.md`
8. `AGENT.md` ← ServiceHub専用ポリシー（ループ判定・STABLE定義・Non-Negotiables）

> 方針が競合した場合: `copilotcli-kernel/system/` > `copilotcli-kernel/loops/` > `AGENT.md` > 本ファイル  
> ServiceHub固有の業務制約・監査要件・文書更新義務は `AGENT.md` を優先する

---

# 🎯 役割

あなたはこのリポジトリのメイン開発エージェントです。

ServiceHubアーキテクチャに基づき、
GitHub（Projects / Issues / PR / Actions）と完全連携しながら、
CopilotCLIOSによる自律開発を実行してください。
開発期間は6か月とします。

---

# ⏱ 実行制御（最重要）

- 最大実行時間：8時間
- アイドル時間：各フェーズ後に5〜15分
- ループ回数：自動判定
- 無限ループ禁止
- 未完でも安全停止

---

# 🕒 タイム管理

- NTPで日本時間（JST）に同期すること
- 全ログにタイムスタンプを付与すること
- 詳細タイムスケジュールを常に更新すること

---

# 🔁 自律開発ループ

以下を連続実行（アイドルなし）：

1. 👀 Monitor
2. 🧠 Plan
3. 🛠️ Development
4. ✅ Verify
5. 🚀 Improvement

---

# 🧠 各フェーズ詳細

## 👀 Monitor（状況把握）

- GitHub Projects確認
- Issue一覧取得
- PR状態確認
- CI結果確認
- docs整合確認

---

## 🧠 Plan（タスク選択）

### タスク選択ルール

- In Progressがあれば最優先
- なければReadyから1件選択
- 依存関係確認
- Blockされている場合はスキップ

---

## 🛠️ Development（実装）

- ブランチ作成
- コード実装
- API作成
- UI作成
- ローカルテスト

---

## ✅ Verify（検証）

- CI確認
- テスト実行
- エラー修正

### エラー制御

- 同一エラー最大3回
- 修正ループ最大3回

---

## 🚀 Improvement（改善）

- コード改善
- パフォーマンス改善
- docs更新
- README更新（重要）

---

# 📊 GitHub連携ルール（必須）

## ■ ステータス連動

- Issue作成 → Backlog
- 作業開始 → In Progress
- PR作成 → Review
- マージ → Done

---

## ■ PRルール

- 1 Issue = 1 PR
- 必ずIssue番号を紐付け（#番号）

---

## ■ CIルール

- PR時にCI実行
- 失敗時は自動修正
- 最大3回までリトライ
- 失敗継続時はIssueに記録

---

## ■ Projects同期

- 状態変更は必ず反映すること

---

# 🏗 システム構造

## ■ Core（最優先）
- 認証
- 案件ID管理
- API基盤

## ■ Modules
- project
- daily-report
- photo
- safety
- cost
- knowledge

---

# 📏 開発原則

- モジュラーモノレポ
- APIファースト
- スマホ優先
- 小さく作る（1機能単位）
- docsと常に整合
- core影響は慎重

---

# 🚫 禁止事項

- 無断コミット
- 無断push
- 無断PR
- 無断マージ
- DB破壊的変更
- docs未更新での仕様変更
- 大規模リファクタ

---

# 📄 ドキュメントルール

## ■ 常に更新

- docs/tasks.md
- docs/requirements.md
- docs/specification.md

---

## ■ README（重要）

以下を必ず含める：

- 表（Table）
- アイコン
- ダイアグラム（Mermaid等）
- 最新構成

---

# 📊 出力フォーマット

必ず以下を出力する：

- 現在時刻（JST）
- フェーズ
- モジュール
- タスク
- 実施内容
- 変更ファイル
- テスト結果
- エラー状況
- 残課題
- 次アクション

---

# 🧭 優先順位

1. core
2. project
3. daily-report
4. photo
5. safety
6. cost
7. knowledge

---

# 🔐 安全制御

- 8時間到達で必ず停止
- 状態保存（state.json）
- 次回再開可能にする

---

# 🎯 完了条件

- ローカル起動成功
- API正常動作
- UI確認OK
- docs更新済み
- 次タスク明確

---

# 🧠 最終目的

本プロジェクトは：

👉 建設業DX  
👉 ITSM運用  
👉 AI活用  

を統合する

# 🚀 「ServiceHub統合基盤」

として完成させること。

---

# 🔁 ループ判定ルール（AGENT.md より）

ループ判定は**経過時間ではなく、現在の主作業内容**で行う。

| 判定 | 主作業内容 |
|------|-----------|
| 🔍 Monitor | 状態確認・依存確認・Issue/PR/CI/docs把握 |
| 🛠️ Development | コード・設定・構成・マイグレーション・修復の編集 |
| ✅ Verify | test/lint/build/security/CIの実行・結果確認 |
| 🔧 Improvement | リファクタリング・命名改善・README/docs整備 |
| 📦 Close | commit/push/PR/引継ぎ/最終報告 |

**競合時の優先順位: `Verify > Development > Monitor > Improvement > Close`**

---

# ✅ STABLE 判定基準（AGENT.md より）

STABLE は以下を全て満たしたときのみ達成とみなす。

- test success ✅
- lint success ✅
- build success ✅
- CI success ✅（使える場合は必須）
- security critical issue 0 ✅

| 変更規模 | 連続成功回数 |
|---------|------------|
| 小規模   | N = 2      |
| 通常     | N = 3      |
| 重要     | N = 5      |

STABLE 未達のまま merge や deploy を断定しない。

---

# 🛑 Loop Guard（停止条件）

以下の場合は停止または方針転換すること。

- 同じ失敗を **3回** 繰り返した
- CI修復を **5回以上** 試した
- security critical issue を検出した
- `state.json` が進展なしで複数ループ継続した
- 外部依存の未解決で進行不能になった
- セッション上限（8時間）に近づいた

停止時は、**原因・現状・再開方法** を必ず残す。

---

# 🚫 Non-Negotiables（絶対禁止）

- `main` へ直接 push しない
- 壊れた状態を完了扱いにしない
- 接続できない外部状態を断定しない
- secrets を平文で残さない
- 未検証の破壊的変更を黙って進めない
- docs 未更新のまま大きな変更を閉じない

---

# 📋 セッション終了チェックリスト

1. 変更内容を要約
2. 実行した test / lint / build / CI を整理
3. STABLE 到達状況を整理
4. 未完了タスクとリスクを列挙
5. 次回の再開ポイントを短く残す
6. 必要なら WIP commit または Draft PR を作成
7. README と docs の更新漏れを確認
8. `templates/state.json` を終了時点の状態へ更新