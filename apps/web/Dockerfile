# Vite produces static files; Nginx serves them and proxies API requests to `api:4000`.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace=@shipyard/web --include-workspace-root=false
COPY apps/web ./apps/web
RUN npm run build --workspace=@shipyard/web

# Unprivileged Nginx listens on 8080 instead of requiring root for port 80.
FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime
# Pull patched distro libraries before dropping back to the unprivileged account.
USER root
RUN apk upgrade --no-cache
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
USER 101
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
