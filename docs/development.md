# Development and checks

Use Node **22.12 or newer in the 22 release line**, plus Docker Desktop. Check `node --version` before installing dependencies. If you use nvm, `nvm use` reads the included `.nvmrc`. CI and Docker also use Node 22.

## Normal container workflow

```bash
node scripts/setup.mjs
docker compose up --build -d
docker compose ps
```

Edit source and rebuild with the same Compose command. The database volume survives rebuilds. `docker compose logs --tail=50 api` shows structured request logs without tokens or payloads.

## Fast frontend editing

Keep Compose healthy, then use the existing gateway for the API:

```bash
npm ci
npm run dev -w apps/web -- --host 127.0.0.1
```

The default Vite proxy targets native API port 4000. For frontend-only editing against Compose, change the two proxy targets in `apps/web/vite.config.js` to `http://127.0.0.1:8080`. Restart Vite after that edit. Restore them before committing if you use native development later.

For native API editing, run a separate disposable MongoDB on localhost with authentication, matching the connection URL in `.env`, then `npm run dev`. Compose deliberately does not expose the database by default. Container-based development is the recommended first path.

## Automated checks

```bash
npm ci
npm run check
```

`npm run check` runs API tests, real MongoDB integration, component tests, the production web build, and YAML/reference checks. It does not contact AWS or apply manifests.

For a real browser, after Compose is healthy:

```bash
npx playwright install chromium
npm run test:browser
```

The browser suite checks desktop and mobile navigation, invalid-token handling, saved data surviving refresh, filtering and layout width. It writes clearly named `browser-test` journal entries. It never embeds a token in screenshots or localStorage.

`mongodb-memory-server` downloads a disposable MongoDB binary on its first integration test. If your environment cannot download/run that binary, set `TEST_MONGODB_URI` to a disposable test database. Failures are not silently skipped.

Terraform checks:

```bash
terraform -chdir=infra/terraform init -backend=false
terraform -chdir=infra/terraform fmt -check
terraform -chdir=infra/terraform validate
kubectl kustomize deploy/base
kubectl kustomize deploy/overlays/eks
```

Formatting: use Prettier for supported JavaScript, JSX, CSS, HTML, JSON, YAML and Markdown files. Use `terraform fmt` for Terraform. Private/generated files are excluded in `.prettierignore`.

## Free demo

Run `npm run build:demo` and `npm run test:demo` to check the browser-only showcase. See `free-demo.md` for the deployment path and the distinction from the real API.

## Design choices to understand

The web UI uses a write token rather than a complete multiuser identity system. Public reads are suitable for nonconfidential demo records. For a team product, replace the shared token with individual identities, roles, revocation and an audit trail.

Journal counts are derived from stored entries and labelled accordingly. The app does not pretend to know build success, latency or cluster health without the corresponding data source.
