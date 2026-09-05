FROM node:20-alpine AS builder
WORKDIR /app
# Build context is the repo root (see docker-compose.prod.yml) so npm ci can
# see the root lockfile and resolve the exact tree CI tests, instead of
# `npm install` re-resolving a fresh tree from packages/gateway/package.json
# alone. npm ci refuses to run when the lockfile lists a workspace whose
# manifest is missing, so every workspace manifest is copied even though
# only packages/gateway's dependencies get installed below.
COPY package.json package-lock.json ./
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY packages/client/package.json packages/client/package.json
COPY packages/gateway/package.json packages/gateway/package.json
COPY packages/mcp/package.json packages/mcp/package.json
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
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY packages/client/package.json packages/client/package.json
COPY packages/gateway/package.json packages/gateway/package.json
COPY packages/mcp/package.json packages/mcp/package.json
# node:20-alpine bundles npm 10, which crashes resolving @vitest/coverage-v8's exact
# vitest peer pin ("Cannot read properties of null (reading 'edgesOut')"); npm >= 11 resolves it.
RUN npm install -g npm@11
RUN npm ci --omit=dev --no-audit --no-fund -w packages/gateway
COPY --from=builder /app/packages/gateway/dist ./packages/gateway/dist
WORKDIR /app/packages/gateway
EXPOSE 3001
CMD ["node", "dist/index.js"]
