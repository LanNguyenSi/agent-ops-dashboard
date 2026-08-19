FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
# node:20-alpine bundles npm 10, which crashes resolving @vitest/coverage-v8's exact
# vitest peer pin ("Cannot read properties of null (reading 'edgesOut')"); npm >= 11 resolves it.
RUN npm install -g npm@11
RUN npm install
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc && cp -r src/db/migrations dist/db/migrations

FROM node:20-alpine
WORKDIR /app
COPY package.json ./
# node:20-alpine bundles npm 10, which crashes resolving @vitest/coverage-v8's exact
# vitest peer pin ("Cannot read properties of null (reading 'edgesOut')"); npm >= 11 resolves it.
RUN npm install -g npm@11
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
