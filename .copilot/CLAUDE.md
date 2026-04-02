/loop 1h  everything-opilotcli-code Monitor
/loop 2h  everything-opilotcli-code Development
/loop 2h  everything-opilotcli-code Verify
/loop 3h  everything-opilotcli-code Improvement

以降、日本語で対応・解説してください。

このファイルは `.copilot` 配下に置く**グローバル設定用 CLAUDE.md** です。
プロジェクト個別の `CLAUDE.md` より上位の運用方針として、`everything-opilotcli-code` を正規構成として扱うことを定義します。

## 0. 正規構成

完全自立型開発の正規構成は次です。

- `.copilot/everything-opilotcli-code`

以後、agents、skills、commands、rules、hooks、scripts、contexts、examples、mcp-configs、kernel 文書はすべてこのディレクトリを基準に扱ってください。

旧構成や重複フォルダを新たな正規構成として扱わないこと。

## 1. グローバル運用目的

- Claude Code を完全自立型開発モードで運用する
- Agent Teams、SubAgents、Hooks、Git WorkTree、MCP、GitHub Projects、GitHub Actions を最大限活用する
- 8 時間上限、Loop Guard、STABLE 判定、再開容易性を標準ルールとする
- README とドキュメントをコードと同じ成果物として扱う

## 2. 適用対象

このグローバル設定は以下に適用する。

- 新規に作成する Claude Code プロジェクト
- 既存プロジェクトへ `everything-opilotcli-code` を導入する場合
- 自律開発モードで長時間運用するセッション

## 3. 参照すべき正規ファイル

グローバル設定の具体内容は、以下を正規参照先とする。

- `everything-opilotcli-code/CLAUDE.md`
- `everything-opilotcli-code/README.md`
- `everything-opilotcli-code/docs/INSTALLATION.md`
- `everything-opilotcli-code/docs/OPERATIONS.md`

## 4. 自律開発の基本ルール

- 日本語で対応、解説する
- 8 時間の時間内で Monitor、Development、Verify、Improvement をアイドル状態なしで N 回ループで進める
- Agent Teams 機能を大いに活用し、会話をリアルタイム可視化する
- Auto Mode による自律開発を実行する
- 詳細タイムスケジュールを含めて全プロセスと状況を可視化する
- README.md は表、アイコン、Mermaid ダイアグラムを活用して常に更新する
- ドキュメントファイルを常に確認、更新する
- GitHub Projects を司令盤として扱う

## 5. ループ構成

| ループ | 時間 | 責務 | 禁止事項 |
|---|---|---|---|
| 🔍 Monitor | 1h | GitHub/CI/Issue状態確認、Projects整合確認、タイムスケジュール生成、README更新 | 実装・修復 |
| 🔨 Development | 2h | 設計、実装、修復、WorkTree管理、README機能追記 | `main` への直接 push |
| ✔ Verify | 2h | test / lint / build / security確認、STABLE判定、README状態更新 | 未テストの merge |
| 🔧 Improvement | 3h | 改善、最適化、技術負債解消、リファクタリング、README最終整備 | 破壊的変更の無断実行 |

### ループ判定の原則

ループ判定は時間ではなく、**現在の主作業内容** で正確に行う。

優先順位:

`Verify > Development > Monitor > Improvement`

補足:

- test、lint、build、security確認、GitHub Actions 結果確認が主作業なら `Verify`
- 設計、実装、修復、設定変更、WorkTree 操作が主作業なら `Development`
- GitHub、CI、Issue、Projects、README、制約確認、スケジュール生成が主作業なら `Monitor`
- 命名改善、技術負債解消、リファクタリング、README や docs の整備が主作業なら `Improvement`

## 6. Boot Sequence

everything-opilotcli-code カーネルファイルは `~/.copilot/everything-opilotcli-code` に配置済み前提で扱う。
作業開始時は以下を順序通り読み込む。

| レイヤー | ファイル | 状態 |
|---|---|---|
| Core | `everything-opilotcli-code/system/orchestrator.md` | ✅/❌ |
| Core | `everything-opilotcli-code/system/projects-switch.md` | ✅/❌ |
| Core | `everything-opilotcli-code/system/token-budget.md` | ✅/❌ |
| Core | `everything-opilotcli-code/system/loop-guard.md` | ✅/❌ |
| Executive | `everything-opilotcli-code/executive/ai-cto.md` | ✅/❌ |
| Executive | `everything-opilotcli-code/executive/architecture-board.md` | ✅/❌ |
| Management | `everything-opilotcli-code/management/scrum-master.md` | ✅/❌ |
| Management | `everything-opilotcli-code/management/dev-factory.md` | ✅/❌ |
| Loops | `everything-opilotcli-code/loops/monitor-loop.md` | ✅/❌ |
| Loops | `everything-opilotcli-code/loops/build-loop.md` | ✅/❌ |
| Loops | `everything-opilotcli-code/loops/verify-loop.md` | ✅/❌ |
| Loops | `everything-opilotcli-code/loops/improve-loop.md` | ✅/❌ |
| Loops | `everything-opilotcli-code/loops/architecture-check-loop.md` | ✅/❌ |
| CI | `everything-opilotcli-code/ci/ci-manager.md` | ✅/❌ |
| Evolution | `everything-opilotcli-code/evolution/self-evolution.md` | ✅/❌ |

ファイルが存在しない場合はスキップし、Monitor ループ開始時に不足ファイル一覧を報告すること。

## 7. Agent Teams 可視化ルール

Agent 間の議論と判断は、正規 `CLAUDE.md` に定義されたパターン③形式で可視化すること。

役割:

- 🧠 CTO
- 🏗 Architect
- 👨‍💻 Developer
- 🔎 Reviewer
- 🧪 QA
- 🔐 Security
- 🚀 DevOps

## 8. 使用機能

- Agent Teams（会話可視化必須）
- 全 SubAgents 機能
- 全 Hooks 機能（並列実行）
- 全 Git WorkTree プロジェクト開発機能
- Memory MCP / Claude-mem / 全 MCP 機能
- GitHub CLI / GitHub Actions

## 9. GitHub 運用

- GitHub Projects を司令盤として扱う
- 推奨状態遷移:
  `Inbox → Backlog → Ready → Design → Development → Verify → Deploy Gate → Done / Blocked`
- セッション開始、終了時、および各ループ終了時に状態を更新する
- 接続不可なら `未接続` または `不明` と明記する

## 10. STABLE 判定

条件:

- test success
- CI success
- lint success
- build success
- error 0
- security critical issue 0

| 変更規模 | 連続成功回数 | 適用例 |
|---|---|---|
| 小規模 | N=2 | コメント修正・軽微な修正 |
| 通常 | N=3 | 機能追加・バグ修正 |
| 重要 | N=5 | 認証・セキュリティ・DB変更 |

STABLE 未達は merge / deploy 禁止。
8 時間到達時は STABLE 未達でも安全停止を優先する。

## 11. 8時間到達時の必須処理

1. 現在の作業内容を整理
2. 最小単位で commit
3. push
4. PR 作成（Draft 可）
5. GitHub Projects Status 更新
6. test / lint / build / CI 結果整理
7. 残課題・再開ポイント整理
8. README.md に終了時サマリーを記載、更新
9. 最終報告出力

## 12. 行動原則

```text
Small change         / Test everything
Stable first         / Deploy safely
Improve continuously / Stop at 8 hours safely
Document always      / README keeps truth
```

## 13. 結論

このグローバル設定ファイルは、`everything-opilotcli-code` を唯一の正規基盤として扱うための入口である。
実運用時は、必ず `everything-opilotcli-code/CLAUDE.md` をプロジェクト側標準として適用し、このファイルはその上位方針として参照すること。
