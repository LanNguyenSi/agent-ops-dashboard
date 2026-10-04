.PHONY: install dev dev-docker docker-up docker-down build test lint ci clean deploy deploy-pull logs health help

# Default target
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm ci

dev: ## Start development server (local)
	npm run dev

dev-docker: docker-up ## Start development server (Docker)

docker-up: ## Start Docker development environment
	docker compose -f docker-compose.dev.yml up --build

docker-down: ## Stop Docker development environment
	docker compose -f docker-compose.dev.yml down

build: ## Build for production
	npm run build

test: ## Run tests
	npm test

lint: ## Run linting and type-checking (same commands as CI)
	npm run lint --workspace=apps/dashboard
	npm run lint --workspace=packages/gateway
	cd apps/dashboard && npx tsc --noEmit
	npm run typecheck --workspace=packages/gateway

ci: lint test ## Run the CI checks (lint, type-check, test, build)
	GITHUB_TOKEN=mock_token_for_build GITHUB_REPOS=mock/repo npm run build

clean: ## Remove build artifacts and dependencies
	rm -rf node_modules .next dist build coverage

# Production deployment targets

deploy: ## Deploy to production (rebuild + restart)
	docker compose -f docker-compose.prod.yml up -d --build

deploy-pull: ## Pull latest code and deploy (for VPS)
	git pull origin master
	docker compose -f docker-compose.prod.yml up -d --build

logs: ## Show production logs (tail 200 lines, follow)
	docker compose -f docker-compose.prod.yml logs --tail=200 -f

health: ## Check production health endpoint
	@curl -s http://localhost:3000/api/health | jq . || echo "Health check failed"
