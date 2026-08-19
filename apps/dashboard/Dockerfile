FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
# npm >= 11: node 22's bundled npm 10 crashes resolving @vitest/coverage-v8's exact
# vitest peer pin ("edgesOut"). No --legacy-peer-deps: it suppresses peer auto-install,
# dropping @testing-library/dom (peer of @testing-library/react) and its types.
RUN npm install -g npm@11
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
# same npm 10 arborist crash applies to the prod-only resolve (full tree is resolved)
RUN npm install -g npm@11
RUN npm install --omit=dev
COPY --from=builder /app/.next ./.next

EXPOSE 3000
CMD ["npm", "start"]
