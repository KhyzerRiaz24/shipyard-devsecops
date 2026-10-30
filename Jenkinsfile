// Delivery boundary: test -> inspect -> build -> scan -> publish immutable images.
// Promotion is a reviewed Git change (scripts/promote.mjs); Argo CD owns deployment.
// Agent requirements and SonarQube webhook setup are in docs/pipeline.md.
pipeline {
  agent { label 'shipyard' }
  options { timestamps(); disableConcurrentBuilds(); timeout(time: 30, unit: 'MINUTES'); buildDiscarder(logRotator(numToKeepStr: '15')) }
  parameters {
    string(name: 'AWS_REGION', defaultValue: 'eu-west-2', description: 'Region matching Terraform')
    string(name: 'ECR_REGISTRY', defaultValue: '', description: 'Account registry, e.g. 123456789012.dkr.ecr.eu-west-2.amazonaws.com')
    string(name: 'PROJECT_NAME', defaultValue: 'shipyard', description: 'Terraform project_name')
  }
  environment { CI = 'true' }
  stages {
    stage('Checkout') {
      steps { checkout scm; script { env.REVISION = sh(script: 'git rev-parse HEAD', returnStdout: true).trim() } }
    }
    stage('Check configuration') {
      steps {
        sh 'node --version && npm ci --no-fund'
        sh 'terraform -chdir=infra/terraform fmt -check && terraform -chdir=infra/terraform init -backend=false -input=false && terraform -chdir=infra/terraform validate'
        sh 'npm run check:config && kubectl kustomize deploy/base > /dev/null && kubectl kustomize deploy/overlays/eks > /dev/null'
      }
    }
    stage('Tests and web build') { steps { sh 'npm test && npm run build' } }
    stage('Dependency and secret gates') {
      steps {
        sh 'npm audit --omit=dev --audit-level=high'
        sh 'node scripts/check-secrets.mjs'
        sh 'trivy fs --scanners vuln --severity HIGH,CRITICAL --exit-code 1 --skip-dirs node_modules --skip-dirs .git --skip-dirs .cache .'
      }
    }
    stage('SonarQube analysis') {
      steps { withSonarQubeEnv('shipyard-sonarqube') { sh 'sonar-scanner' } }
    }
    stage('Quality gate') {
      steps { timeout(time: 5, unit: 'MINUTES') { waitForQualityGate abortPipeline: true } }
    }
    stage('Build containers') {
      steps {
        sh 'docker build --pull --platform linux/amd64 --build-arg APP_VERSION=$REVISION -f apps/api/Dockerfile -t shipyard-api:$REVISION .'
        sh 'docker build --pull --platform linux/amd64 -f apps/web/Dockerfile -t shipyard-web:$REVISION .'
      }
    }
    stage('Image vulnerability gates') {
      steps {
        sh 'trivy image --severity HIGH,CRITICAL --exit-code 1 shipyard-api:$REVISION'
        sh 'trivy image --severity HIGH,CRITICAL --exit-code 1 shipyard-web:$REVISION'
      }
    }
    stage('Publish from main') {
      when { branch 'main' }
      steps {
        withEnv(["AWS_REGION=${params.AWS_REGION}", "ECR_REGISTRY=${params.ECR_REGISTRY}", "PROJECT_NAME=${params.PROJECT_NAME}"]) {
          // Shell variables are quoted and validated in this script, never interpolated as code.
          sh 'bash scripts/publish.sh'
        }
        archiveArtifacts artifacts: 'evidence/images.json', fingerprint: true
      }
    }
  }
  post { always { cleanWs() } }
}
