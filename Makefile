# ================================================
# ServiceHub Construction Platform - Makefile
# 使用方法: make <command>
# ================================================

.PHONY: help up down build logs shell-api shell-db migrate seed test lint clean

## ヘルプ
help:
	@echo ""
	@echo "🏗️  ServiceHub Construction Platform"
	@echo "=================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

## 起動
up: ## 全サービス起動
	docker compose up -d
	@echo "✅ 起動完了"
	@echo "  API:      http://localhost:8000"
	@echo "  Frontend: http://localhost:3000"
	@echo "  MinIO:    http://localhost:9001"
	@echo "  DB:       localhost:5432"

up-build: ## ビルドして起動
	docker compose up -d --build

down: ## 停止
	docker compose down

down-v: ## 停止（ボリューム削除）
	docker compose down -v
	@echo "⚠️  全ボリューム削除済み"

## ビルド
build: ## イメージビルド
	docker compose build

build-no-cache: ## キャッシュなしでビルド
	docker compose build --no-cache

## ログ
logs: ## 全サービスログ
	docker compose logs -f

logs-api: ## APIログ
	docker compose logs -f api

logs-db: ## DBログ
	docker compose logs -f db

## シェル
shell-api: ## APIコンテナに入る
	docker compose exec api /bin/bash

shell-db: ## DBコンテナに入る
	docker compose exec db psql -U servicehub -d servicehub_db

## データベース
migrate: ## マイグレーション実行
	docker compose exec api alembic upgrade head

migrate-down: ## マイグレーション1つ戻す
	docker compose exec api alembic downgrade -1

migrate-history: ## マイグレーション履歴
	docker compose exec api alembic history

seed: ## シードデータ投入（開発用）
	docker compose exec api python -m app.db.seeds.seed_dev

## テスト
test: ## テスト実行
	docker compose exec api pytest tests/ -v --cov=app --cov-report=html

test-unit: ## 単体テストのみ
	docker compose exec api pytest tests/unit/ -v

test-integration: ## 統合テストのみ
	docker compose exec api pytest tests/integration/ -v

## コード品質
lint: ## リント実行
	docker compose exec api ruff check app/
	docker compose exec api ruff format --check app/

format: ## コードフォーマット
	docker compose exec api ruff format app/

typecheck: ## 型チェック
	docker compose exec api mypy app/

## クリーンアップ
clean: ## 一時ファイル削除
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	find . -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true

## セットアップ
setup: ## 初回セットアップ
	@echo "🚀 ServiceHub Construction Platform セットアップ"
	cp -n .env.example .env || true
	make build
	make up
	sleep 5
	make migrate
	make seed
	@echo "✅ セットアップ完了！"
	@echo "  http://localhost:3000 にアクセスしてください"
