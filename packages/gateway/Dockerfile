FROM node:20-alpine AS builder
WORKDIR /app
# Build context is the repo root (see docker-compose.prod.yml) so npm ci can
# see the root lockfile and resolve the exact tree CI tests, instead of
# `npm install` re-resolving a fresh tree from packages/gateway/package.json
# alone. Only the root manifests and this workspace's manifest are needed:
# npm ci does not require the sibling workspace manifests (measured, see
# CHANGELOG) and the docker-smoke job enforces the resulting versions.
COPY package.json package-lock.json ./
COPY packages/gateway/package.json packages/gateway/package.json
# node:20-alpine bundles npm 10, which crashes resolving @vitest/coverage-v8's exact
# vitest peer pin ("Cannot read properties of null (reading 'edgesOut')"); npm >= 11 resolves it.
RUN npm install -g npm@11
RUN npm ci --no-audit --no-fund -w packages/gateway
COPY packages/gateway/tsconfig.json packages/gateway/tsconfig.build.json packages/gateway/
COPY packages/gateway/src packages/gateway/src
WORKDIR /app/packages/gateway
RUN npx tsc -p tsconfig.build.json && cp -r src/db/migrations dist/db/migrations

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/gateway/package.json packages/gateway/package.json
# node:20-alpine bundles npm 10, which crashes resolving @vitest/coverage-v8's exact
# vitest peer pin ("Cannot read properties of null (reading 'edgesOut')"); npm >= 11 resolves it.
RUN npm install -g npm@11
RUN npm ci --omit=dev --no-audit --no-fund -w packages/gateway
COPY --from=builder /app/packages/gateway/dist ./packages/gateway/dist
WORKDIR /app/packages/gateway
EXPOSE 3001
CMD ["node", "dist/index.js"]
