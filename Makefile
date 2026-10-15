.PHONY: install dev dev-docker docker-up docker-down build test lint ci clean deploy deploy-pull logs health health-gateway help

# Default target
.DEFAULT_GOAL := help

# Override to probe another host or port, e.g. make health DASHBOARD_URL=http://host:3000
DASHBOARD_URL ?= http://localhost:3000
GATEWAY_URL ?= http://127.0.0.1:3001

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm ci

dev: ## Start development server (local)
	npm run dev

dev-docker: docker-up ## Alias for docker-up

docker-up: ## Start dashboard dev server + Postgres in Docker (no gateway; the dashboard does not use this Postgres)
	docker compose -f docker-compose.dev.yml up --build

docker-down: ## Stop the docker-up containers
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

health: ## Check the dashboard at localhost:3000 (dev loop or default compose; prod compose publishes no port)
	@out=$$(curl -fsS --max-time 10 $(DASHBOARD_URL)/api/health) \
		|| { echo "Health check failed: no healthy answer from $(DASHBOARD_URL)/api/health" >&2; exit 1; }; \
	echo "$$out" | jq . 2>/dev/null || echo "$$out"

health-gateway: ## Check the gateway at 127.0.0.1:3001 (default and prod compose)
	@out=$$(curl -fsS --max-time 10 $(GATEWAY_URL)/health) \
		|| { echo "Health check failed: no healthy answer from $(GATEWAY_URL)/health" >&2; exit 1; }; \
	echo "$$out" | jq . 2>/dev/null || echo "$$out"
