# Claude Code 完全自立開発ベストプラクティス

このフォルダは、`01`〜`05` と `曜日別作業` を横断精査して抽出した、Claude Code 向けの実運用パックです。

目的は 1 つです。

- ClaudeOS 系の強い運用思想を残す
- ただし Claude Code でそのまま運用できる粒度に落とす
- 設定、役割、ループ、GitHub 運用、README 更新方針を最初から揃える

## このパックで揃うもの

| ファイル | 役割 |
|---|---|
| `CLAUDE.md` | Claude Code 用の中核運用ポリシー |
| `.copilot/settings.json` | 推奨設定 |
| `.copilot/agents/*.md` | 役割別サブエージェント定義 |
| `docs/design-principles.md` | 設計・運用の判断原則 |
| `docs/operation-loops.md` | Monitor / Build / Verify / Improve の現実的運用 |
| `docs/github-integration.md` | GitHub / Projects / CI 連動の実務指針 |
| `docs/session-templates.md` | セッション開始・終了テンプレート |
| `docs/readme-template.md` | README の推奨テンプレート |

## 元資料から抽出した中核原則

1. `Monitor -> Build -> Verify -> Improve` の順で進める
2. 8時間上限、Loop Guard、STABLE 判定を明文化する
3. main 直接 push を禁止し、ブランチまたは worktree を使う
4. GitHub Projects / Issues / PR / Actions の整合を重視する
5. セキュリティ・準拠・監査証跡を軽視しない
6. README とドキュメントを成果物として扱う

## Claude Code 向けに調整した点

- 「常に全機能を使う」ではなく、必要時のみ Agent / Worktree / GitHub 連動を使う
- 時間駆動の厳密ループではなく、フェーズ完了ベースで回す
- 参照できない GitHub / CI / MCP の状態を推測しない
- README は毎回全面更新せず、利用者に影響する変更時に更新する
- 重い可視化より、再開しやすいチェックリストを優先する

## 導入手順

1. このフォルダの `CLAUDE.md` を対象リポジトリのルートへ配置
2. `.copilot/` 配下を対象リポジトリへコピー
3. `docs/readme-template.md` を参考に README を整備
4. GitHub Projects を使う場合は `docs/github-integration.md` の運用に合わせる

## 推奨対象

- 単独でも自走したい Claude Code プロジェクト
- 複数リポジトリをまたぐ統合開発
- ISO / NIST / ITSM 系の統制が必要な社内システム開発

## 注意

このパックは「完全放置の全自動化」ではなく、
`安全停止できる自立開発` を目指した設定です。

無理に毎回フルオーケストレーションせず、
変更規模に応じて軽量運用へ落とせるようにしています。
