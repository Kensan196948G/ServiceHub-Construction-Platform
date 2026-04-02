# GitHub Integration Best Practices

曜日別資料で重視されていた GitHub 連動を、Claude Code で破綻しない範囲に整理したガイドです。

## 1. GitHub の役割

| 機能 | 役割 |
|---|---|
| Issues | タスクの起点 |
| Projects | 状態管理 |
| PR | 差分レビューと品質ゲート |
| Actions | test / lint / build / security の実行 |

## 2. 推奨状態遷移

`Inbox -> Backlog -> Ready -> Design -> Development -> Verify -> Deploy Gate -> Done / Blocked`

## 3. Claude Code で守るべきこと

- 接続できない GitHub 状態を推測しない
- Projects が使えないならローカルのメモで代替する
- CI が未整備なら、未整備であることを先に記録する

## 4. PR 本文の最低限

- 変更内容
- テスト結果
- 影響範囲
- 残課題

## 5. CI の考え方

CI は「見栄え」ではなく品質ゲートです。

最低限欲しいもの:

- lint
- unit test
- build
- dependency / security scan

## 6. Auto Repair の現実的運用

自動修復は有効ですが、以下で止める。

- 同じ失敗が続く
- 修正が推測ベースになった
- 依存や secrets に原因がある

## 7. Worktree の使いどころ

向いている場面:

- 複数機能を並列で触る
- 比較検証したい
- main 作業を汚したくない

不要な場面:

- 1 ファイルの小修正
- ドキュメント更新のみ
