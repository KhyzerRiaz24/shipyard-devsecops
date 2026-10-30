# AWS deployment guide

This guide is an operator procedure, not a claim that this project has already run in your AWS account. No cloud resources are created by local tests or `terraform validate`.

Prerequisites: an AWS account with reviewed provisioning permissions, AWS CLI v2 authentication, Terraform 1.10+, kubectl compatible with the cluster, Helm, your own Git repository and published container images. AWS resources here are billable. Use a budget alert and tear down the demo when finished.

## 1. Review infrastructure inputs

```bash
cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars
```

Edit the copied file. Supply a stable IAM role/user ARN (not the ARN of an assumed STS session), and your trusted public IPv4 address as `/32`. Use the region you actually intend to deploy in. Check the [EKS support calendar](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html) before choosing the cluster version.

Terraform uses the AWS credential chain. Do not put keys in `.tf` or `.tfvars` files. The initial local state contains resource metadata; keep it private and backed up. For shared work, configure an encrypted versioned S3 backend with state locking before collaboration. Do not share state through Git.

## 2. Plan, inspect, then apply

```bash
terraform -chdir=infra/terraform init
terraform -chdir=infra/terraform fmt -check
terraform -chdir=infra/terraform validate
terraform -chdir=infra/terraform plan -out=shipyard.tfplan
terraform -chdir=infra/terraform apply shipyard.tfplan
terraform -chdir=infra/terraform output
```

Review every proposed resource before applying. The plan includes EKS Auto Mode, nodes as workloads require them, NAT, logging and ECR. One NAT is a portfolio tradeoff, not full network high availability. The cluster endpoint allows only your configured CIDRs; update them if your IP changes.

Configure kubectl with the actual Terraform outputs:

```bash
aws eks update-kubeconfig --name shipyard --region eu-west-2
kubectl config current-context
kubectl get nodes
```

Substitute your own name/region if changed. Only the `admin_principal_arn` has the explicit admin access association.

## 3. Configure images and secrets

Run Jenkins as described in `pipeline.md`, publish images, and prepare the digest-based promotion. Update `deploy/argocd/application.yaml` to your repository URL. For a private repository, configure read-only credentials in Argo CD separately; never commit them.

```bash
kubectl apply -f deploy/base/namespace.yaml
node scripts/k8s-secrets.mjs EXACT_CONTEXT_FROM_THE_PREVIOUS_COMMAND
node scripts/check-config.mjs --release
```

Replace the context argument. The secrets script creates new cluster-only passwords and stores a private recovery copy under `.cache`. It refuses to overwrite existing credentials. Secure that copy and never commit it. The database user is created only on first initialization of an empty data volume; read the rotation notes in `runbooks.md` before any later credential changes.

## 4. Install the management components

The following upstream chart versions were selected and rendered locally during implementation. Record them in your deployment evidence and review release notes before upgrading. Rendering does not verify a live cluster installation.

```bash
helm repo add argo https://argoproj.github.io/argo-helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/
helm repo update
helm upgrade --install argocd argo/argo-cd --namespace argocd --create-namespace --set server.service.type=ClusterIP --version 10.11.6
helm upgrade --install metrics-server metrics-server/metrics-server --namespace kube-system --version 3.14.0
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack --namespace monitoring --create-namespace --values monitoring/values.yaml --version 92.16.1
```

Auto Mode handles its own ALB and EBS capabilities; do not install the standard controllers as duplicate replacements.

Then apply the application and monitoring configuration:

```bash
kubectl apply -f deploy/argocd/application.yaml
kubectl apply -f monitoring/servicemonitor.yaml -f monitoring/alerts.yaml
kubectl -n shipyard rollout status deployment/api --timeout=180s
kubectl -n shipyard rollout status deployment/web --timeout=180s
kubectl -n shipyard get pods,pvc,hpa
```

Use Argo CD's UI/events to diagnose sync failures. The first database volume and nodes may take longer than the example timeout; inspect their state rather than repeatedly recreating them. Confirm your CNI enforces NetworkPolicy; it is part of the intended security boundary.

## 5. Access privately first

```bash
kubectl -n shipyard port-forward service/web 8080:8080
```

Open http://localhost:8080. Stop the local Compose web container first if its port is occupied. A port-forward is a private operator workflow; it is not a public ingress test.

For private dashboards, use separate terminals:

```bash
kubectl -n argocd port-forward service/argocd-server 8443:443
kubectl -n monitoring port-forward service/monitoring-grafana 3000:80
```

Retrieve initial administrative passwords privately using the tools' official procedures; rotate them and configure access control before exposing either service. Import `monitoring/dashboard.json` in Grafana and choose its Prometheus data source. Configure a real Alertmanager receiver before claiming notifications work.

## 6. Optional public HTTPS

Obtain an ACM certificate in the same region, validate your domain, and edit `deploy/ingress/eks-https.example.yaml`. Set the certificate ARN and host, apply the edited file, then create the DNS record pointing to the reported ALB hostname. The manifest uses an HTTPS-only listener. Never transmit the write token over public HTTP.

```bash
kubectl apply -f deploy/ingress/eks-https.example.yaml
kubectl -n shipyard get ingress shipyard
```

Check TLS, gateway readiness, journal reads/writes, and MongoDB persistence through the actual hostname. Keep generated secrets, example values and local results out of your public repository.

Primary references: [Auto Mode Terraform configuration](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster), [Auto Mode ALB configuration](https://docs.aws.amazon.com/eks/latest/userguide/auto-configure-alb.html), [Auto Mode EBS StorageClass](https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html). Check their current contracts when upgrading.
