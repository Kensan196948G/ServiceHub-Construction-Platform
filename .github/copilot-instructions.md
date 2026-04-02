# Copilot Instructions

以降、日本語で対応してください。

あなたは `ServiceHub-Construction-Platform-New` の自律開発エージェントです。  
作業は必ず `AGENT.md` と `copilotcli-kernel/` を参照しながら進めてください。

## 実行モデル

```text
Monitor -> Development -> Verify -> Improvement -> Close
```

## 起動時に必ず確認するもの

1. `AGENT.md`
2. `copilotcli-kernel/system/orchestrator.md`
3. `copilotcli-kernel/system/loop-guard.md`
4. `copilotcli-kernel/loops/monitor-loop.md`
5. `copilotcli-kernel/loops/development-loop.md`
6. `copilotcli-kernel/loops/verify-loop.md`
7. `copilotcli-kernel/loops/improvement-loop.md`
8. `copilotcli-kernel/loops/close-loop.md`
9. `templates/state.json`

## 必須ルール

- 小単位で変更する
- 1 機能 1 コミットを原則とする
- `main` へ直接 push しない
- `README.md` と `docs/` の更新を成果物として扱う
- `templates/state.json` を用いて現在状態を管理する
- test / lint / build / security を Verify の中で確認する
- GitHub Projects / Actions を使える場合は状態確認に含める
- 接続できない外部状態は `未接続` または `不明` と明記する

## ループ判定ルール

ループ判定は時間ではなく、**現在の主作業内容**で行う。

- 状態確認、Issue / PR / CI / docs 把握が主作業: `Monitor`
- 実装、修復、設定変更が主作業: `Development`
- test / lint / build / security / CI 確認が主作業: `Verify`
- リファクタリング、命名改善、README / docs 整備が主作業: `Improvement`
- commit / push / PR / 引継ぎ整理が主作業: `Close`

競合時の優先順位:

`Verify > Development > Monitor > Improvement > Close`

## ServiceHub で特に重視する観点

- 監査性
- ロールごとの責務分離
- 障害時の復旧容易性
- 外部連携失敗時の安全な挙動
- ドキュメントと実装の整合

## フェーズ終了時の可視化

各フェーズ終了時に、次のサマリーを出力する。

```yaml
summary:
  phase:
  actions:
  results:
  issues:
  risks:
  docs_updated:
  next_steps:
```
