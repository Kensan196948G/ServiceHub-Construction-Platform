# Session Templates

Claude Code セッションを毎回同じ品質で始めるためのテンプレートです。

## 開始テンプレート

```text
開始前確認
- 対象: {プロジェクト名}
- 今日の目的: {1行}
- 成功条件:
  1. {条件}
  2. {条件}
  3. {条件}
- 参照資料: {requirements/design/README/Issue}
- Git 状態: {branch / dirty / clean}
- 検証手段: {test / lint / build / CI}
- リスク: {なし / 内容}
```

## Monitor 出力テンプレート

```text
Monitor結果
- 今回やること: {1行}
- 触る範囲: {ファイル or モジュール}
- 先に確認した制約: {要件/互換性/規格}
- 完了の定義: {1行}
```

## Verify 出力テンプレート

```text
Verify結果
- test: {success/fail}
- lint: {success/fail}
- build: {success/fail}
- 未確認: {あれば}
- 判定: {continue / stable / blocked}
```

## 終了テンプレート

```text
終了サマリ
- 実施内容: {1〜3行}
- テスト結果: {1〜3行}
- 未完了: {箇条書き}
- 再開ポイント: {次に何をするか}
- GitHub更新: {Issue / PR / Projects の有無}
```
