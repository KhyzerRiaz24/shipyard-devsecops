# Verification record — 30 October 2026

Verified locally on macOS arm64 with Node 22.23.2 and Docker Engine 29.9.2. Local results do not imply an AWS deployment or a successful remote Jenkins/SonarQube integration.

## Completed

- **Application checks:** `npm run check` passed: nine API/database/process tests, five React interaction tests, production frontend build, YAML/reference checks and an offline credential-pattern check.
- **Coverage:** API line coverage 92.50%; web line coverage 98.06%. Coverage reports include their defined source files; coverage is not proof of correctness.
- **Real database:** verified inserts survive MongoDB client reconnection, duplicate identifiers are rejected, and the real API process handles readiness and graceful SIGTERM shutdown.
- **Browser checks:** both Chromium desktop and mobile suites passed against the real Compose deployment. Checked invalid-token rejection, saved entries surviving refresh, navigation, filtering, browser token storage and layout width. Browser traces are disabled so entered tokens are not captured in trace artifacts.
- **Container build/start:** both Dockerfiles built; MongoDB, API and gateway became healthy. Only `127.0.0.1:8080` is exposed by Compose.
- **Container replacement:** all three containers were recreated; all six pre-existing browser-test journal entries remained present in the named database volume.
- **Database interruption:** stopping MongoDB produced HTTP 200 from liveness and HTTP 503 from readiness. MongoDB was restarted and the application recovered.
- **Backup restoration:** a two-entry journal archive restored into a separate timestamped database with zero failed documents; the original journal remained unchanged.
- **Read-only local load:** 200 requests at concurrency ten, zero failures; client p95 approximately 22.5 milliseconds in that local run. This is not a production-capacity claim. The generated report is in the ignored `evidence/` directory.
- **Dependency audit:** npm's production dependency audit reported zero known advisories at check time. A Trivy lockfile scan found zero high/critical vulnerabilities, including the development dependency graph.
- **Final runtime image scans:** Trivy found zero high/critical vulnerabilities in both final API and web images. The initial images had findings; runtime simplification and available distro patches resolved the reported findings. No vulnerability-ignore file or disabled gate was used.
- **Offline credential patterns:** Git-eligible text files passed the dependency-free local checker. This matches common AWS/GitHub/OpenAI/private-key formats; it is not an exhaustive secret audit.
- **Terraform:** `fmt -check` and provider-based `validate` passed with Terraform 1.14.7 and AWS provider 6.71.0. No plan or apply was executed against an AWS account.
- **Kubernetes:** both Kustomize assemblies rendered; the final EKS overlay contained 16 resources and passed strict Kubernetes schema validation with zero errors/skips.
- **Monitoring rules:** Prometheus `promtool check rules` accepted all four alert expressions.
- **Helm rendering:** pinned upstream Argo CD 10.11.6, metrics-server 3.14.0, and kube-prometheus-stack 92.16.1 charts rendered locally for Kubernetes 1.35. Their rendered YAML parsed successfully. This does not verify live controller permissions, cluster capacity or scheduling.
- **Shell scripts:** backup, restore and publishing scripts passed shell syntax checks. The publishing script has not contacted ECR.

## Not yet executed

The following need your account/repository configuration and live environments:

- AWS Terraform plan/apply, networking and EKS Auto Mode provisioning.
- A real Jenkins agent run, SonarQube analysis/webhook and its configured quality gate.
- ECR publishing and verification of the Linux amd64 release images built by Jenkins. Local Compose images were built for this Mac's arm64 architecture.
- Argo CD sync, HPA behaviour, NetworkPolicy enforcement, EBS attachment and an actual cluster rollout/recovery exercise.
- Public domain/ACM TLS setup, live Prometheus/Grafana scraping and external alert delivery.
- Off-cluster scheduled backups, production restore cutover and database high availability. The database has one member.

No software can be promised to have zero bugs. This record identifies the checks that passed, their scope, and the remaining environment-dependent verification.

## Refactor and free showcase — 30 October 2026

The application shell now selects pages from one navigation definition. `useWorkspace.js` owns data loading and ignores stale refresh responses. `telemetry.js` owns request measurement/logging, so API routes remain readable. Purpose and connection comments remain present in the authored source.

The free GitHub Pages build uses an explicit browser-storage adapter, with a visible demo banner and storage labels. It does not report a fake database connection or require an API token. The normal Docker build continues to use the real Express/MongoDB path.

Local verification after these changes passed 20 API/database/UI/demo tests, two real-application browser tests, and two static-demo browser tests. Both production modes built successfully. The live GitHub Actions checks also passed on Linux, including real temporary MongoDB integration, Terraform validation, Kubernetes rendering, dependency audit and the demo browser checks.

The public repository and workflow are available at:

- Source: https://github.com/KhyzerRiaz24/shipyard-devsecops
- Initial live checks: https://github.com/KhyzerRiaz24/shipyard-devsecops/actions/runs/41069816255
- Workflow: https://github.com/KhyzerRiaz24/shipyard-devsecops/actions/workflows/check-and-deploy.yml

The selected public hosting uses GitHub Pages and standard public-repository runners. No paid AWS resources were created. AWS/Jenkins/SonarQube deployment remains outside the verified live showcase scope.
