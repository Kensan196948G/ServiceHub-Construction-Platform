# Orchestrator

## 役割

Copilot CLI 用の全体統制。

## 実行順

1. Environment Check
2. Project Check
3. Boot File Check
4. Loop Selection
5. Role Switching
6. Verification and Reporting

## 出力

- project
- loop status
- current phase
- risks

## 注意

Copilot CLI ではネイティブ loop 機能が前提ではないため、プロンプトと `state.json` で疑似的に管理する。
