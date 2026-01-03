#!/bin/bash

# ============================================
# Deploy Application to Kubernetes
# ============================================

# Ensure we are in the project root
cd "$(dirname "$0")/.."

# 1. Deploy Secrets & Config
echo "Deploying Secrets..."
./scripts/deploy-k8s-config.sh

# 2. Deploy Backend
echo "Deploying Backend..."
kubectl apply -f infra/aws/k8s/backend-deployment.yaml

echo "Waiting for Backend LoadBalancer..."
kubectl wait --namespace kayak \
  --for=condition=ready pod \
  --selector=app=backend \
  --timeout=90s

# Get Backend URL
BACKEND_LB=$(kubectl get svc backend -n kayak -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
if [ -z "$BACKEND_LB" ]; then
  # Fallback for AWS LoadBalancer Controller (might take time)
  echo "WARNING: Backend LoadBalancer hostname not ready yet. Waiting..."
  sleep 30
  BACKEND_LB=$(kubectl get svc backend -n kayak -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
fi

if [ -z "$BACKEND_LB" ]; then
  echo "ERROR: Could not get Backend LoadBalancer URL. Is the service type LoadBalancer?"
  exit 1
fi

BACKEND_URL="http://$BACKEND_LB"
echo "Backend URL: $BACKEND_URL"

# 3. Build & Push Frontend (with Backend URL)
echo "Rebuilding Frontend with API URL..."

# Load AWS Account ID & Region
source .env
ECR_REPO="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kayak-dev-frontend"

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build
docker build \
  --build-arg VITE_API_BASE_URL="$BACKEND_URL" \
  --build-arg VITE_API_VERSION="v1" \
  -t $ECR_REPO:latest \
  ./frontend

# Push
docker push $ECR_REPO:latest

# 4. Deploy Frontend
echo "Deploying Frontend..."
kubectl apply -f infra/aws/k8s/frontend-deployment.yaml

# Restart to pick up new image
kubectl rollout restart deployment/frontend -n kayak

echo "Application Deployed Successfully!"
echo "Frontend URL: http://$(kubectl get svc frontend -n kayak -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
