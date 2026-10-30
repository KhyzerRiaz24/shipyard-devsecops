# Continuous integration and deployment

## Active free showcase pipeline

`.github/workflows/check-and-deploy.yml` runs GitHub Actions checks for the real application and the explicit browser demo, then deploys the demo to GitHub Pages. The standard public-repository runner requires no AWS credentials. See `free-demo.md` for its scope.

## Optional Jenkins/AWS pipeline

The supplied Jenkinsfile is an executable pipeline definition. It needs a real Jenkins controller, a dedicated trusted build agent, SonarQube, Trivy and an AWS role before a full remote run can pass. Local tests do not prove those external integrations.

## Configure Jenkins

1. Create a multibranch pipeline for your own repository with `main` as the release branch.
2. Use a dedicated Linux agent labelled `shipyard` with Git, Node 22.12+, Docker CLI/daemon, AWS CLI v2, Terraform 1.10+, kubectl, Trivy and sonar-scanner on PATH. Prefer x86_64 for the initial AWS run; EKS can provision compatible x86_64 nodes. Do not reuse this privileged build agent for untrusted pull requests.
3. Install Pipeline, Git, Pipeline: Multibranch, SonarQube Scanner, Credentials Binding and Workspace Cleanup plugins. The agent's Docker access is privileged; isolate the machine rather than making its Docker socket world-writable.
4. Configure a SonarQube server named `shipyard-sonarqube` in Jenkins system settings. Store its analysis token in Jenkins credentials. In SonarQube, configure the Jenkins webhook URL ending in `/sonarqube-webhook/` (including the trailing slash). Configure the webhook secret on both sides when available.
5. Attach Terraform's `publisher_policy_arn` policy to the build agent's AWS IAM role. Configure the role through the agent's environment, not committed access keys. The role can publish only to this project's ECR repositories; it cannot administer EKS.
6. Set pipeline parameters `AWS_REGION`, `ECR_REGISTRY`, and `PROJECT_NAME` using Terraform outputs. The registry is the hostname only, without a repository path or `https://`.

Run the pipeline after pushing your own source. No step in this repository creates a Jenkins server for you. Use a private, patched Jenkins controller and trusted agents; infrastructure here focuses on the application platform.

## What fails a build

Tests fail on incorrect behaviour or an unavailable integration-test database. `npm audit` fails on high/critical production dependency advisories. The offline source credential-pattern check catches common AWS, GitHub, OpenAI and private-key formats without sending source to a service. It is not an exhaustive secret audit. Trivy source dependency scanning and image scanning fail on high/critical findings. SonarQube must pass its configured quality gate.

Scans use current advisory databases. A base image can gain new findings later; update and rebuild it rather than hiding failures. If you accept a finding, document its actual exposure, owner and expiry before adding a narrowly scoped exception. This repo ships with no blanket ignore file.

Jenkins does not run `terraform apply`. It checks syntax/provider configuration only. Infrastructure changes need a reviewed plan in the target account.

## Publish and promote

Jenkins builds images tagged with the full Git SHA. ECR rejects tag overwrites. Re-running publication for the exact same commit can therefore fail by design; use the archived digest from the original successful build, or build a new source commit.

After a successful `main` run, download the `evidence/images.json` build artifact. It contains image references and digests, not secrets. Prepare a release using the actual values:

```bash
node scripts/promote.mjs API_ECR_REPOSITORY@sha256:ACTUAL_DIGEST WEB_ECR_REPOSITORY@sha256:ACTUAL_DIGEST
node scripts/check-config.mjs --release
git diff -- deploy/overlays/eks/kustomization.yaml
```

Replace the uppercase example arguments; they intentionally fail validation as written. Commit the overlay change in a promotion branch and open a pull request. After review and merge, Argo CD reconciles the new desired state. Git remains the deployment source of truth.

Record a journal entry only after observing the resulting rollout and smoke tests. The journal does not trigger this pipeline automatically.

## Failed release

Kubernetes readiness checks prevent unhealthy new API pods from taking service traffic. They do not prove all application behaviour is correct. Run smoke tests after promotion. To recover, revert the promotion commit and wait for Argo CD to reconcile. See `docs/runbooks.md` for a controlled exercise.
