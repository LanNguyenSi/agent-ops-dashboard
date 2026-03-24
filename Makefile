.PHONY: install hooks dev dev-docker docker-up docker-down build test lint format ci clean deploy deploy-pull logs health help

# Default target
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm ci

hooks: ## Set up Git pre-commit hooks (Husky + lint-staged)
	npx husky init
	cp .husky-pre-commit .husky/pre-commit
	chmod +x .husky/pre-commit

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

lint: ## Run linting and type-checking
	npm run lint
	npm run type-check

format: ## Format code
	npm run format

format-check: ## Check code formatting
	npm run format:check

ci: format-check lint test build ## Run all CI checks (format, lint, test, build)

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
