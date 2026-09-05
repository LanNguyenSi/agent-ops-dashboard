FROM node:22-alpine AS builder
WORKDIR /app
# Build context is the repo root (see docker-compose.prod.yml) so npm ci can
# see the root lockfile and resolve the exact tree CI tests, instead of
# `npm install` re-resolving a fresh tree from apps/dashboard/package.json
# alone. npm ci refuses to run when the lockfile lists a workspace whose
# manifest is missing, so every workspace manifest is copied even though
# only apps/dashboard's dependencies get installed below.
COPY package.json package-lock.json ./
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY packages/client/package.json packages/client/package.json
COPY packages/gateway/package.json packages/gateway/package.json
COPY packages/mcp/package.json packages/mcp/package.json
# npm >= 11: node 22's bundled npm 10 crashes resolving @vitest/coverage-v8's exact
# vitest peer pin ("edgesOut"). No --legacy-peer-deps: it suppresses peer auto-install,
# dropping @testing-library/dom (peer of @testing-library/react) and its types.
RUN npm install -g npm@11
RUN npm ci --no-audit --no-fund -w apps/dashboard
COPY apps/dashboard apps/dashboard
WORKDIR /app/apps/dashboard
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY packages/client/package.json packages/client/package.json
COPY packages/gateway/package.json packages/gateway/package.json
COPY packages/mcp/package.json packages/mcp/package.json
# same npm 10 arborist crash applies to the prod-only resolve (full tree is resolved)
RUN npm install -g npm@11
RUN npm ci --omit=dev --no-audit --no-fund -w apps/dashboard
COPY --from=builder /app/apps/dashboard/.next ./apps/dashboard/.next
WORKDIR /app/apps/dashboard

EXPOSE 3000
CMD ["npm", "start"]
