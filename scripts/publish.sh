#!/usr/bin/env bash
# Trusted Jenkins agent with an IAM role bearing Terraform's publisher policy. No static AWS keys.
set -euo pipefail
: "${ECR_REGISTRY:?Configure Jenkins ECR_REGISTRY}"
: "${AWS_REGION:?Configure AWS_REGION}"
: "${PROJECT_NAME:?Configure PROJECT_NAME}"
: "${REVISION:?Jenkins sets the Git commit}"
[[ "$ECR_REGISTRY" =~ ^[0-9]{12}\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com$ ]] || { echo 'Invalid ECR registry' >&2; exit 1; }
[[ "$PROJECT_NAME" =~ ^[a-z][a-z0-9-]{2,19}$ ]] || { echo 'Invalid project prefix' >&2; exit 1; }
[[ "$REVISION" =~ ^[a-f0-9]{40}$ ]] || { echo 'Expected a full Git SHA' >&2; exit 1; }
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"
trap 'docker logout "$ECR_REGISTRY" >/dev/null 2>&1 || true' EXIT
mkdir -p evidence
for service in api web; do
  target="$ECR_REGISTRY/$PROJECT_NAME-$service:$REVISION"
  docker tag "shipyard-$service:$REVISION" "$target"
  docker push "$target"
done
# Query registry-owned immutable digests; these become the reviewed promotion input.
api_digest="$(aws ecr describe-images --region "$AWS_REGION" --repository-name "$PROJECT_NAME-api" --image-ids "imageTag=$REVISION" --query 'imageDetails[0].imageDigest' --output text)"
web_digest="$(aws ecr describe-images --region "$AWS_REGION" --repository-name "$PROJECT_NAME-web" --image-ids "imageTag=$REVISION" --query 'imageDetails[0].imageDigest' --output text)"
export SHIPYARD_API_IMAGE="$ECR_REGISTRY/$PROJECT_NAME-api@$api_digest"
export SHIPYARD_WEB_IMAGE="$ECR_REGISTRY/$PROJECT_NAME-web@$web_digest"
node --input-type=module -e 'import {writeFileSync} from "node:fs"; writeFileSync("evidence/images.json", JSON.stringify({revision: process.env.REVISION, api: process.env.SHIPYARD_API_IMAGE, web: process.env.SHIPYARD_WEB_IMAGE}, null, 2)+"\n")'
