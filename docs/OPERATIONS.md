# 運用ガイド

この文書は、`ServiceHub-Construction-Platform-New` を Copilot CLI で自律開発するときの実行手順です。  
`AGENT.md` を方針、`copilotcli-kernel/` を判断基準、この `OPERATIONS.md` を実行ガイドとして使います。

## 1. 基本思想

- 調査してから実装する
- 小さく変更して大きく壊さない
- 変更後は必ず検証する
- README と docs を常に更新する
- `templates/state.json` で現在状態を残す
- 停滞したら Loop Guard を優先する

## 2. 推奨ループ

1. Monitor
2. Development
3. Verify
4. Improvement
5. Close

## 3. ループ判定の実務ルール

ループ判定は時間ではなく、**現在の主作業内容**で行います。

| ループ | 主作業 | 典型例 |
|---|---|---|
| Monitor | 状態確認、依存確認、Issue / PR / CI / docs の把握 | 何から着手するか決める、障害の状況だけ調べる |
| Development | 設計、実装、修復、設定変更 | コード編集、設定修正、WorkTree 整理 |
| Verify | test / lint / build / security / CI 確認 | 実装後の検証、失敗原因の切り分け |
| Improvement | リファクタリング、命名改善、README / docs 整備 | 可読性改善、説明更新、技術負債整理 |
| Close | commit、push、PR、引継ぎ整理 | セッション終了、再開ポイント整理 |

競合時の優先順位:

```text
Verify > Development > Monitor > Improvement > Close
```

## 4. `state.json` の役割

`templates/state.json` は、疑似ループ運用を破綻させないためのセッション状態ファイルです。

### 管理項目

| キー | 意味 |
|---|---|
| `phase` | 現在のループ |
| `loop_count` | 何回目のループか |
| `stable_success_count` | STABLE 判定に向けた連続成功回数 |
| `status` | `running` / `blocked` / `done` などの状態 |
| `issues` | 現在の課題、失敗、保留事項 |
| `risks` | リスクや懸念点 |
| `next_targets` | 次にやる具体タスク |
| `last_update` | 最終更新時刻 |
| `last_summary` | 直近フェーズの短い要約 |

### 更新タイミング

- セッション開始直後
- 各ループ終了時
- ブロック発生時
- STABLE 判定更新時
- セッション終了時

## 5. `state.json` の運用例

### 開始直後

```json
{
  "phase": "Monitor",
  "loop_count": 1,
  "stable_success_count": 0,
  "status": "running",
  "issues": [],
  "risks": [
    "GitHub Projects 接続未確認"
  ],
  "next_targets": [
    "README と docs の現状確認",
    "テスト手段の確認"
  ],
  "last_update": "2026-04-02 09:00 JST",
  "last_summary": "セッション開始。Monitor で前提確認を実施。"
}
```

### Development 開始前

```json
{
  "phase": "Development",
  "loop_count": 1,
  "stable_success_count": 0,
  "status": "running",
  "issues": [
    "対象機能の入力検証が不足"
  ],
  "risks": [
    "既存 API 仕様との差分確認が必要"
  ],
  "next_targets": [
    "設計差分の整理",
    "最小単位で実装",
    "README 追記"
  ],
  "last_update": "2026-04-02 10:15 JST",
  "last_summary": "Monitor 完了。対象範囲と阻害要因を整理し、Development へ移行。"
}
```

### Verify 成功後

```json
{
  "phase": "Verify",
  "loop_count": 1,
  "stable_success_count": 1,
  "status": "running",
  "issues": [],
  "risks": [
    "CI の再確認待ち"
  ],
  "next_targets": [
    "README に検証結果を反映",
    "改善余地の整理"
  ],
  "last_update": "2026-04-02 12:40 JST",
  "last_summary": "test / lint / build が通過。STABLE count を 1 に更新。"
}
```

### Blocked 時

```json
{
  "phase": "Verify",
  "loop_count": 2,
  "stable_success_count": 0,
  "status": "blocked",
  "issues": [
    "外部 API 接続失敗で統合確認不可"
  ],
  "risks": [
    "ダミー値で進めると誤実装の恐れ"
  ],
  "next_targets": [
    "接続条件を確認",
    "代替検証手段の有無を調べる"
  ],
  "last_update": "2026-04-02 14:10 JST",
  "last_summary": "外部依存で Verify が停止。Loop Guard に従い方針転換が必要。"
}
```

### Close 時

```json
{
  "phase": "Close",
  "loop_count": 2,
  "stable_success_count": 2,
  "status": "done",
  "issues": [
    "残タスクは別セッションで対応"
  ],
  "risks": [],
  "next_targets": [
    "次回は API 連携部分の Verify から再開"
  ],
  "last_update": "2026-04-02 17:55 JST",
  "last_summary": "README と docs を更新し、最終報告と再開ポイントを整理して Close。"
}
```

## 6. フェーズ終了サマリーテンプレート

各ループ終了時は、状態を短く残してから次へ進みます。

### 共通テンプレート

```yaml
summary:
  phase:
  actions:
  results:
  issues:
  risks:
  docs_updated:
  state_update:
  next_steps:
```

### Monitor 終了例

```yaml
summary:
  phase: Monitor
  actions:
    - README と docs を確認
    - Git 状態とテスト手段を確認
    - 現在の課題と優先順位を整理
  results:
    - 対象機能と影響範囲を確定
  issues:
    - GitHub Projects 接続は未確認
  risks:
    - 既存 API 仕様との差分確認が必要
  docs_updated:
    - README の現状把握のみ
  state_update:
    - phase=Development
    - loop_count=1
  next_steps:
    - 最小単位で実装を開始
```

### Development 終了例

```yaml
summary:
  phase: Development
  actions:
    - 入力検証ロジックを実装
    - 例外処理を追加
    - README に機能説明を追記
  results:
    - 実装完了
    - Verify へ進める状態になった
  issues:
    - 統合確認は未実施
  risks:
    - 外部 API 応答の差分リスクあり
  docs_updated:
    - README
    - API 関連メモ
  state_update:
    - phase=Verify
    - next_targets=[test, lint, build]
  next_steps:
    - 検証を実行
```

### Verify 終了例

```yaml
summary:
  phase: Verify
  actions:
    - test 実行
    - lint 実行
    - build 実行
    - security 観点を確認
  results:
    - test success
    - lint success
    - build success
  issues:
    - CI は未接続
  risks:
    - 本番相当データでの検証は未実施
  docs_updated:
    - README に検証結果を反映
  state_update:
    - stable_success_count=1
    - phase=Improvement
  next_steps:
    - 命名と構造を整える
```

### Improvement 終了例

```yaml
summary:
  phase: Improvement
  actions:
    - 命名改善
    - 重複コード削減
    - README と docs の整備
  results:
    - 保守性が向上
  issues:
    - 大きな未解決なし
  risks:
    - 将来的に共通化余地あり
  docs_updated:
    - README
    - docs/OPERATIONS.md
  state_update:
    - phase=Close
  next_steps:
    - commit と最終整理
```

### Close 終了例

```yaml
summary:
  phase: Close
  actions:
    - 変更内容を整理
    - README / docs を最終更新
    - 再開ポイントを記録
  results:
    - セッションを安全終了
  issues:
    - 残タスクは次回対応
  risks:
    - 外部連携の本番検証は別途必要
  docs_updated:
    - README
    - docs
  state_update:
    - status=done
    - phase=Close
  next_steps:
    - 次回は Verify または Development から再開
```

## 7. 停止条件

- 同じ失敗を繰り返している
- 外部依存が原因で進めない
- 破壊的変更の影響が読めない
- セキュリティ懸念が大きい
- `state.json` に進展がなく停滞している

## 8. 再開時に残すもの

- 何をやったか
- 何が通ったか
- 何が詰まっているか
- 次にやる一手
- `state.json` の最終状態
