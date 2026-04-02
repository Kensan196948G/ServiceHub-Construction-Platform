# 問題管理

## 概要

問題管理プロセスは、繰り返し発生するインシデントの根本原因を特定し、恒久的な解決策を実施してインシデントの再発を防止する。ISO20000の8.6.2に準拠して設計する。

---

## 問題管理の目的

| 目的 | 内容 |
|-----|------|
| 根本原因分析 | インシデントの根本的な原因を特定する |
| 再発防止 | 恒久的な解決策を実施してインシデントを再発させない |
| 回避策提供 | 恒久解決まで一時的な回避策を提供する |
| 既知エラーDB | 解決済み・既知の問題をナレッジとして管理する |

---

## 問題発生トリガー

| トリガー | 条件 |
|---------|------|
| インシデントの繰り返し | 同一カテゴリで月3件以上 |
| 重大インシデント後 | P1インシデントの事後分析から |
| トレンド分析 | 指標の悪化傾向を検知 |
| 予防的分析 | 潜在的な問題を事前に特定 |

---

## 根本原因分析（RCA）手法

### 5-Why分析例

```
問題: ログインAPIが定期的に500エラーを返す

Why 1: データベース接続が失敗するから
Why 2: 接続プールが枯渇するから
Why 3: 長時間実行クエリが接続を占有するから
Why 4: インデックスが不足しているクエリがあるから
Why 5: 開発時にクエリの実行計画を確認していなかったから

根本原因: クエリのパフォーマンステストと
         実行計画の確認プロセスがなかった

恒久対策:
1. 問題のあるクエリにインデックスを追加
2. 開発規約にクエリパフォーマンス確認を追加
3. CIでスロークエリ検出テストを追加
```

### フィッシュボーン（特性要因）図の活用

複雑な問題については、フィッシュボーン図で原因を体系的に整理する。

---

## データモデル

```sql
CREATE TABLE itsm.problems (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_number  VARCHAR(20) UNIQUE NOT NULL,
    title           VARCHAR(200) NOT NULL,
    description     TEXT NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'open',
    priority        VARCHAR(10) NOT NULL DEFAULT 'P3',
    category        VARCHAR(100),
    root_cause      TEXT,
    workaround      TEXT,
    permanent_fix   TEXT,
    is_known_error  BOOLEAN NOT NULL DEFAULT FALSE,
    assignee_id     UUID REFERENCES auth.users(id),
    related_incident_count INTEGER NOT NULL DEFAULT 0,
    opened_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 既知エラーデータベース（KEDB）

解決済みの問題・回避策が確立した問題は「既知エラー（Known Error）」として登録し、インシデント対応時に参照できるようにする。

| フィールド | 内容 |
|---------|------|
| 問題ID | 一意の問題番号 |
| タイトル | 問題の概要 |
| 症状 | ユーザーが観察できる症状 |
| 根本原因 | 特定された根本原因 |
| 回避策 | 一時的な回避策 |
| 恒久解決策 | 恒久的な修正内容 |
| ステータス | 調査中/回避策あり/解決済み |

---

## 問題管理KPI

| KPI | 目標値 | 測定方法 |
|-----|--------|---------|
| 問題解決率（月次） | ≥70% | 解決件数/発生件数 |
| 問題解決期間（P1・P2） | ≤10営業日 | 開始〜クローズ日 |
| 既知エラー解決率 | 月次改善 | KEDB件数の推移 |
| インシデント再発率 | ≤10% | 問題クローズ後30日以内の再発 |
