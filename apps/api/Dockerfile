# Build from repository root: docker build -f apps/api/Dockerfile .
# The root lockfile supplies exactly the same dependency graph as Jenkins tests.
FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --omit=dev --workspace=@shipyard/api --include-workspace-root=false && npm cache clean --force

# Minimal runtime: the application needs Node, but no compiler or package manager.
FROM node:22-alpine AS runtime
RUN apk upgrade --no-cache && rm -rf /usr/local/lib/node_modules /opt/yarn* /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn /usr/local/bin/yarnpkg
ARG APP_VERSION=local
ENV NODE_ENV=production PORT=4000 APP_VERSION=$APP_VERSION
WORKDIR /app
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node apps/api/package.json ./apps/api/package.json
COPY --chown=node:node apps/api/src ./apps/api/src
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:4000/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/api/src/server.js"]
