# File guide and reading order

Every authored source/configuration file starts with a purpose comment when its format permits comments. Read a page component next to its “How this page works” panel in the browser. Do not try to memorise every tool first.

## Application

- `apps/web/index.html`: HTML entry; loads `src/main.jsx`.
- `apps/web/src/main.jsx`: mounts React and imports `styles.css`.
- `apps/web/src/App.jsx`: navigation, shared data loading, error states and modal ownership. Imports the four pages below.
- `apps/web/src/pages/Overview.jsx`: derives journal counts and displays live API/database information.
- `apps/web/src/pages/Releases.jsx`: filters the latest 100 journal entries by text and environment.
- `apps/web/src/pages/Architecture.jsx`: explains application and delivery paths. This is a reference, not live topology.
- `apps/web/src/pages/Runbooks.jsx`: explains and copies commands; never executes them.
- `apps/web/src/components/Journal.jsx`: shared journal table, outcome badges and explanation panel.
- `apps/web/src/components/ReleaseDialog.jsx`: authenticated write form; uses `api.js`, then asks `App.jsx` to reload data.
- `apps/web/src/hooks/useWorkspace.js`: loads the two workspace resources and ignores stale refresh responses.
- `apps/web/src/mode.js`: distinguishes normal builds from the explicit browser demo.
- `apps/web/src/demo.js`: stores demo records in the current browser; does not simulate a running backend.
- `apps/web/src/demo.test.js`: checks demo persistence, validation and storage failures.
- `apps/web/src/api.js`: common fetch/error/timeout handling; no browser token persistence.
- `apps/web/src/styles.css`: layout, colours, responsive navigation and reduced-motion preferences.
- `apps/web/vite.config.js`: React build, development proxy and component-test configuration.
- `apps/web/nginx.conf`: container gateway; serves the build and proxies to `api:4000`. Metrics are not public.
- `apps/api/src/server.js`: reads environment, connects MongoDB, starts HTTP, drains on shutdown.
- `apps/api/src/app.js`: routes, validation, token protection, rate limiting, health, metrics and safe errors.
- `apps/api/src/telemetry.js`: request timings, bounded metrics and safe structured logs; installed by `app.js`.
- `apps/api/src/store.js`: MongoDB connection, indexes, inserts and newest-first reads.
- `ops/mongo-init.js`: creates the restricted database account on first startup.

## Local runtime and packages

- `compose.yaml`: connects MongoDB, API and web; health checks order startup; only the gateway binds localhost.
- `apps/api/Dockerfile`: installs locked production API dependencies and runs as an unprivileged user.
- `apps/web/Dockerfile`: compiles React, copies static output into unprivileged Nginx.
- `package.json`: root workspaces and check commands. The two app package files declare their own dependencies.
- `.nvmrc`: selects Node 22 for nvm users.
- `package-lock.json`: generated dependency versions/integrity; use `npm ci` in repeatable builds. It contains no comments because JSON does not support them.
- `.env.example`: variable names; `.env` contains local secrets and is ignored.
- `.gitignore`, `.dockerignore`, `.prettierignore`: keep generated output and private data out of source/builds/formatting.

## Delivery and infrastructure

- `.github/workflows/check-and-deploy.yml`: validates both application modes and deploys the free GitHub Pages showcase after successful checks.
- `Jenkinsfile`: orders all CI stages; see `docs/pipeline.md` for required services and agent tools.
- `sonar-project.properties`: tells SonarQube where the application code and tests live.
- `infra/terraform/versions.tf`: Terraform/AWS provider requirements and region.
- `infra/terraform/variables.tf`: validated operator inputs.
- `infra/terraform/network.tf`: VPC, subnets, routes and NAT connectivity.
- `infra/terraform/cluster.tf`: control-plane/node roles, EKS Auto Mode, logging and admin access entry.
- `infra/terraform/registry.tf`: immutable ECR repositories and scoped publishing permissions.
- `infra/terraform/outputs.tf`: coordinates used by kubectl and Jenkins; no secrets.
- `infra/terraform/terraform.tfvars.example`: account-specific example; copy locally and edit.
- `infra/terraform/.terraform.lock.hcl`: generated provider selection/checksums; commit when sharing.
- `deploy/base/kustomization.yaml`: groups shared manifests.
- `deploy/base/namespace.yaml`: application namespace.
- `deploy/base/api.yaml`, `web.yaml`: workloads, Services, probes and resource bounds.
- `deploy/base/mongo.yaml`: first-start user initialization, database Service, StatefulSet and persistent volume claim.
- `deploy/base/network.yaml`: incoming traffic restrictions; requires enforcing networking.
- `deploy/base/availability.yaml`: disruption budgets and API horizontal autoscaler.
- `deploy/overlays/eks/kustomization.yaml`: AWS-specific assembly and promoted image digests.
- `deploy/overlays/eks/storage.yaml`: encrypted retained EBS storage with Auto Mode provisioner.
- `deploy/argocd/application.yaml`: tells Argo CD which repository/path to reconcile.
- `deploy/ingress/eks-https.example.yaml`: optional TLS-only public ingress; replace examples before applying.
- `monitoring/values.yaml`: private monitoring installation settings.
- `monitoring/servicemonitor.yaml`: points Prometheus to the API Service’s metrics endpoint.
- `monitoring/alerts.yaml`: availability, error-rate and response-duration alerts.
- `monitoring/dashboard.json`: importable Grafana dashboard with measured HTTP metrics; JSON cannot contain comments.

## Operator scripts and tests

- `scripts/setup.mjs`: writes random local credentials once; never overwrites them.
- `scripts/k8s-secrets.mjs`: validates context and creates cluster secrets using stdin; saves a private recovery copy.
- `scripts/publish.sh`: publishes images using the Jenkins IAM role and archives registry digests.
- `scripts/promote.mjs`: prepares a reviewable digest-based deployment change without applying it.
- `scripts/check-secrets.mjs`: offline checks for common credentials in Git-eligible text files; never prints a matching secret.
- `scripts/check-config.mjs`: parses YAML and verifies Kustomize resource references. `--release` checks account/image configuration too.
- `scripts/backup.sh`: streams a MongoDB archive to an ignored private backup directory.
- `scripts/restore.sh`: restores into an isolated database, preserving the live database.
- `scripts/load-test.mjs`: measures real bounded concurrent reads and saves evidence.
- `apps/api/test/app.test.js`: HTTP behaviour, validation, authentication, failure handling and metrics.
- `apps/api/test/store.test.js`: real MongoDB persistence/reconnection and unique-ID enforcement.
- `apps/web/src/App.test.jsx`, `test-setup.js`: user interactions and error handling in component tests.
- `playwright.demo.config.js`, `tests/demo/showcase.spec.js`: real browser checks of the static demo, including no backend requests.
- `playwright.config.js`, `tests/browser/app.spec.js`: real desktop/mobile browser tests against Compose.
- `evidence/README.md`: what measurements to save and how to interpret them.

## Documentation

The root README is the starting point. The other guides cover architecture, development, Jenkins, AWS deployment, operations, portfolio evidence and actual verification. File paths in explanations are repository-relative, so you can find them in any clone.
