# AGENT.md

以降、日本語で対応・解説してください。

このファイルは `ServiceHub-Construction-Platform-New` 専用の Copilot CLI 自律開発ポリシーです。  
本プロジェクトでは、この `AGENT.md` を起点にしつつ、同一フォルダ配下の `copilotcli-kernel/` を参照して擬似ループ運用を行います。

---

## 1. Mission

- ServiceHub の要件、設計、実装、検証、改善、文書化を一連の自律開発サイクルとして進める
- 建設業向け統合業務プラットフォームとして、監査性、保守性、安全性、再開容易性を常に優先する
- 未完了であっても、安全停止と再開ポイント整理を必ず残す
- `README.md`、`docs/`、`templates/state.json` を含めて、プロジェクトの真実をドキュメントに同期する

---

## 2. Kernel First 原則

作業開始時は、このファイル単体で判断せず、必ず `copilotcli-kernel/` の文書を参照してから動くこと。

### 優先参照順

1. `copilotcli-kernel/system/orchestrator.md`
2. `copilotcli-kernel/system/projects-switch.md`
3. `copilotcli-kernel/system/token-budget.md`
4. `copilotcli-kernel/system/loop-guard.md`
5. `copilotcli-kernel/executive/ai-cto.md`
6. `copilotcli-kernel/executive/architecture-board.md`
7. `copilotcli-kernel/management/scrum-master.md`
8. `copilotcli-kernel/management/dev-factory.md`
9. `copilotcli-kernel/loops/monitor-loop.md`
10. `copilotcli-kernel/loops/development-loop.md`
11. `copilotcli-kernel/loops/verify-loop.md`
12. `copilotcli-kernel/loops/improvement-loop.md`
13. `copilotcli-kernel/loops/close-loop.md`
14. `copilotcli-kernel/loops/architecture-check-loop.md`
15. `copilotcli-kernel/ci/ci-manager.md`
16. `copilotcli-kernel/evolution/self-evolution.md`

### 参照ルール

- 方針が競合した場合は `AGENT.md` よりも `copilotcli-kernel/system/` と `copilotcli-kernel/loops/` を優先する
- ただし、ServiceHub 固有の業務文脈、運用制約、文書更新義務はこの `AGENT.md` を優先する
- 外部状態を確認できない場合は断定せず、`未接続` または `不明` と明示する

---

## 3. Default Mode

- 言語: 日本語
- 実行方式: Copilot CLI の単一セッション自律運用
- 基本サイクル: `Monitor -> Development -> Verify -> Improvement -> Close`
- 実装方針: 小さく変更し、小さく検証し、小さく戻せる状態を維持する
- Git 方針: `main` へ直接 push しない
- 品質方針: 壊れた状態を「完了」とみなさない
- 文書方針: `README.md` と `docs/` はコードと同じ優先度で更新する

---

## 4. Boot Sequence

着手時は次の順序で確認する。

1. 作業対象ディレクトリと主要ファイルの存在確認
2. `README.md`、`AGENT.md`、`docs/` の確認
3. `copilotcli-kernel/` の存在と読込順確認
4. Git 状態、ブランチ、未コミット差分の確認
5. test / lint / build / CI 手段の確認
6. `.github/copilot-instructions.md` の確認
7. `templates/state.json` の初期値または前回状態の確認
8. GitHub Issues / Projects / PR / Actions の接続可否確認
9. 当セッションの成功条件、停止条件、再開条件の整理

Boot Sequence の結果として最低限まとめる内容:

- 現在の主タスク
- 現在のループ
- 直近の阻害要因
- 使える検証手段
- 更新対象の文書

---

## 5. Pseudo Loop Model

本プロジェクトでは `copilotcli-kernel/loops/` を参照しながら、以下の疑似ループで運用する。

### Monitor

参照:

- `copilotcli-kernel/loops/monitor-loop.md`

主な責務:

- 現状把握
- README / docs / state の把握
- Issue / PR / CI / Projects 状態の確認
- 作業優先順位とリスク整理

### Development

参照:

- `copilotcli-kernel/loops/development-loop.md`

主な責務:

- 設計
- 実装
- バグ修復
- 設定変更
- WorkTree を使う並列開発整理

### Verify

参照:

- `copilotcli-kernel/loops/verify-loop.md`
- `copilotcli-kernel/ci/ci-manager.md`

主な責務:

- test
- lint
- build
- security 確認
- CI 結果確認
- STABLE 判定

### Improvement

参照:

- `copilotcli-kernel/loops/improvement-loop.md`
- `copilotcli-kernel/loops/architecture-check-loop.md`

主な責務:

- リファクタリング
- 命名改善
- 技術負債削減
- 保守性改善
- README / docs の磨き込み

### Close

参照:

- `copilotcli-kernel/loops/close-loop.md`

主な責務:

- commit
- push
- PR
- Projects 状態更新
- 最終報告
- 再開ポイント整理

---

## 6. ループ判定ルール

ループ判定は**経過時間ではなく、現在の主作業内容**で行う。  
この判定は厳密に適用し、曖昧なまま進めないこと。

### 判定基準

- 状態確認、依存確認、Issue / CI / README / docs の把握が主作業なら `Monitor`
- コード、設定、構成、マイグレーション、修復の編集が主作業なら `Development`
- test / lint / build / security / CI の実行や結果確認が主作業なら `Verify`
- リファクタリング、命名改善、README / docs 整備が主作業なら `Improvement`
- commit / push / PR / 引継ぎ / 最終報告が主作業なら `Close`

### 競合時の優先順位

`Verify > Development > Monitor > Improvement > Close`

### 具体例

- 実装後に test を回している間は `Verify`
- エラー再現調査だけをしている間は `Monitor`
- README だけを更新している間は `Improvement`
- PR 本文作成と再開メモ整理が主作業なら `Close`

---

## 7. ServiceHub 専用の品質観点

このプロジェクトでは、通常の品質基準に加えて以下を重視する。

- 業務フローの追跡可能性
- ロールごとの責務分離
- 操作ログ、監査ログ、エラー記録の扱い
- 障害時の復旧しやすさ
- 外部連携失敗時の安全なフォールバック
- ドキュメントと実装の乖離防止

設計や実装で迷った場合は、短期的な近道よりも監査性と保守性を優先する。

---

## 8. 疑似 Agent Teams

Copilot CLI ではネイティブ Agent Teams を前提にしにくいため、役割分離で判断する。

### 役割

- Architect: アーキテクチャ、責務分離、境界整理
- Developer: 実装、修正、修復
- Reviewer: 差分確認、可読性、保守性確認
- QA: テスト観点、回帰リスク確認
- Security: secrets、権限、入力検証、脆弱性確認
- DevOps: CI/CD、PR、Projects、デプロイ影響確認

### 使い方

- 大きな判断の前に、各役割の観点を短く整理する
- 実装前は Architect と Developer を優先する
- 変更後は QA、Security、DevOps を必ず通す
- 破壊的変更は Reviewer 観点まで含めて再点検する

---

## 9. State Management

`templates/state.json` を起点に、現在の自律開発状態を管理する。

最低限管理する項目:

- `phase`
- `loop_count`
- `stable_success_count`
- `status`
- `issues`
- `risks`
- `next_targets`
- `last_update`
- `last_summary`

更新タイミング:

- Monitor 開始後
- 各ループ終了後
- 重大な判断変更時
- セッション終了時

---

## 10. GitHub Operating Rules

- GitHub Projects を使える場合は司令盤として扱う
- 推奨状態遷移:
  `Inbox -> Backlog -> Ready -> Design -> Development -> Verify -> Deploy Gate -> Done / Blocked`
- PR には変更内容、テスト結果、影響範囲、未完了事項、再開ポイントを書く
- Actions がある場合は Verify と Close の判断材料に必ず含める
- 接続不可なら `未接続` または `不明` と明記する

---

## 11. STABLE Definition

STABLE は次の条件を満たしたときのみ達成とみなす。

- test success
- CI success
- lint success
- build success
- error 0
- security critical issue 0

| 変更規模 | 連続成功回数 |
|---|---|
| 小規模 | N=2 |
| 通常 | N=3 |
| 重要 | N=5 |

STABLE 未達のまま merge や deploy を断定しない。

---

## 12. Loop Guard

`copilotcli-kernel/system/loop-guard.md` を参照し、以下では停止または方針転換する。

- 同じ失敗を 3 回繰り返した
- CI 修復を 5 回以上試した
- security critical issue を検出した
- `state.json` が進展なしで複数ループ継続した
- 外部依存の未解決で進行不能になった
- セッション上限に近づいた

停止時は、原因、現状、再開方法を必ず残す。

---

## 13. README / docs 更新義務

以下は常に成果物として扱う。

- `README.md`
- `docs/`
- API / DB / 運用 / セキュリティ関連文書

更新タイミング:

- セッション開始時の前提整理
- 主要機能実装後
- Verify 後の状態反映
- Improvement 後の整備
- セッション終了時の最終状態反映

README は「現在の状態が分かること」を優先し、過度に抽象化しない。

---

## 14. Session End Checklist

1. 変更内容を要約
2. 実行した test / lint / build / CI を整理
3. STABLE 到達状況を整理
4. 未完了タスクとリスクを列挙
5. 次回の再開ポイントを短く残す
6. 必要なら WIP commit や Draft PR を作成
7. README と docs の更新漏れを確認する
8. `state.json` を終了時点の状態へ更新する

---

## 15. Non-Negotiables

- `main` へ直接 push しない
- 壊れた状態を完了扱いにしない
- 接続できない外部状態を断定しない
- secrets を平文で残さない
- 未検証の破壊的変更を黙って進めない
- docs 未更新のまま大きな変更を閉じない

---

## 16. One-Line Operating Summary

`copilotcli-kernel` を参照しながら、ServiceHub 専用の文脈で `Monitor -> Development -> Verify -> Improvement -> Close` を厳密判定し、小さく安全に前進し、常に README / docs / state を最新化すること。
