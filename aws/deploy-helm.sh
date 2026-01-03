#!/bin/bash

# Kayak Helm Deployment Script
# This script deploys the Kayak application using Helm charts on EKS

set -e

# Load environment variables
source .env

# Configuration
NAMESPACE="kayak-${ENVIRONMENT:-dev}"
CHART_PATH="./helm/kayak"
RELEASE_NAME="kayak"
REGION="${AWS_REGION:-us-east-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Kayak Helm Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command_exists aws; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

if ! command_exists kubectl; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi

if ! command_exists helm; then
    echo -e "${RED}Error: Helm is not installed${NC}"
    exit 1
fi

if ! command_exists docker; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites met${NC}"

# Step 1: Configure kubectl for EKS
echo -e "\n${YELLOW}Step 1: Configuring kubectl for EKS...${NC}"
CLUSTER_NAME="kayak-${ENVIRONMENT:-dev}"
aws eks update-kubeconfig --name $CLUSTER_NAME --region $REGION --profile ${AWS_PROFILE:-default}
echo -e "${GREEN}✓ kubectl configured${NC}"

# Step 2: Create namespace if it doesn't exist
echo -e "\n${YELLOW}Step 2: Creating namespace...${NC}"
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f - --validate=false
echo -e "${GREEN}✓ Namespace $NAMESPACE ready${NC}"

# Step 3: Check if secrets exist
echo -e "\n${YELLOW}Step 3: Checking secrets...${NC}"

BACKEND_SECRET_EXISTS=$(kubectl get secret kayak-backend-secrets -n $NAMESPACE 2>/dev/null && echo "true" || echo "false")
AGENT_SECRET_EXISTS=$(kubectl get secret kayak-agent-secrets -n $NAMESPACE 2>/dev/null && echo "true" || echo "false")

if [ "$BACKEND_SECRET_EXISTS" == "false" ]; then
    echo -e "${YELLOW}Creating backend secrets from ../backend/.env${NC}"
    
    # Read backend .env and create secret
    if [ -f "../backend/.env" ]; then
        kubectl create secret generic kayak-backend-secrets \
            --namespace=$NAMESPACE \
            --from-literal=DATABASE_URL="$(grep '^DATABASE_URL=' ../backend/.env | cut -d '=' -f2-)" \
            --from-literal=MONGODB_URI="$(grep '^MONGODB_URI=' ../backend/.env | cut -d '=' -f2-)" \
            --from-literal=REDIS_URL="$(grep '^REDIS_URL=' ../backend/.env | cut -d '=' -f2-)" \
            --from-literal=JWT_SECRET="$(grep '^JWT_SECRET=' ../backend/.env | cut -d '=' -f2-)" \
            --from-literal=JWT_EXPIRES_IN="$(grep '^JWT_EXPIRES_IN=' ../backend/.env | cut -d '=' -f2-)" \
            --from-literal=SESSION_SECRET="$(grep '^SESSION_SECRET=' ../backend/.env | cut -d '=' -f2-)" \
            --from-literal=SESSION_MAX_AGE="$(grep '^SESSION_MAX_AGE=' ../backend/.env | cut -d '=' -f2-)" \
            --from-literal=FIREBASE_SERVICE_ACCOUNT="$(grep '^FIREBASE_SERVICE_ACCOUNT=' ../backend/.env | cut -d '=' -f2-)" \
            --from-literal=FIREBASE_STORAGE_BUCKET="$(grep '^FIREBASE_STORAGE_BUCKET=' ../backend/.env | cut -d '=' -f2-)"
        echo -e "${GREEN}✓ Backend secrets created${NC}"
    else
        echo -e "${RED}Error: ../backend/.env not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Backend secrets already exist${NC}"
fi

if [ "$AGENT_SECRET_EXISTS" == "false" ]; then
    echo -e "${YELLOW}Creating agent secrets from ../ai-agent/.env${NC}"
    
    # Read agent .env and create secret
    if [ -f "../ai-agent/.env" ]; then
        kubectl create secret generic kayak-agent-secrets \
            --namespace=$NAMESPACE \
            --from-literal=OPENAI_API_KEY="$(grep '^OPENAI_API_KEY=' ../ai-agent/.env | cut -d '=' -f2-)" \
            --from-literal=TAVILY_API_KEY="$(grep '^TAVILY_API_KEY=' ../ai-agent/.env | cut -d '=' -f2-)" \
            --from-literal=WEATHER_API_KEY="$(grep '^WEATHER_API_KEY=' ../ai-agent/.env | cut -d '=' -f2-)" \
            --from-literal=LANGSMITH_API_KEY="$(grep '^LANGSMITH_API_KEY=' ../ai-agent/.env | cut -d '=' -f2-)" \
            --from-literal=LANGCHAIN_API_KEY="$(grep '^LANGCHAIN_API_KEY=' ../ai-agent/.env | cut -d '=' -f2-)" \
            --from-literal=SUPABASE_ACCESS_TOKEN="$(grep '^SUPABASE_ACCESS_TOKEN=' ../ai-agent/.env | cut -d '=' -f2-)" \
            --from-literal=SUPABASE_SERVICE_ROLE_KEY="$(grep '^SUPABASE_SERVICE_ROLE_KEY=' ../ai-agent/.env | cut -d '=' -f2-)" \
            --from-literal=DATABASE_URL="$(grep '^DATABASE_URL=' ../ai-agent/.env | cut -d '=' -f2-)" \
            --from-literal=SUPABASE_DATABASE_URL="$(grep '^SUPABASE_DATABASE_URL=' ../ai-agent/.env | cut -d '=' -f2-)" \
            --from-literal=MONGODB_URI="$(grep '^MONGODB_URI=' ../ai-agent/.env | cut -d '=' -f2-)" \
            --from-literal=REDIS_URL="$(grep '^REDIS_URL=' ../ai-agent/.env | cut -d '=' -f2-)"
        echo -e "${GREEN}✓ Agent secrets created${NC}"
    else
        echo -e "${RED}Error: ../ai-agent/.env not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Agent secrets already exist${NC}"
fi

# Step 4: Build and push Docker images
echo -e "\n${YELLOW}Step 4: Building and pushing Docker images...${NC}"

# Login to ECR
echo -e "${YELLOW}Logging into ECR...${NC}"
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
echo -e "${GREEN}✓ Logged into ECR${NC}"

# Build and push frontend
echo -e "\n${YELLOW}Building frontend image for linux/amd64...${NC}"
cd ../frontend
docker buildx build --platform linux/amd64 -t $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/kayak-${ENVIRONMENT:-dev}-frontend:${FRONTEND_IMAGE_TAG:-latest} --push .
echo -e "${GREEN}✓ Frontend image pushed${NC}"

# Build and push backend
echo -e "\n${YELLOW}Building backend image for linux/amd64...${NC}"
cd ../backend
docker buildx build --platform linux/amd64 -t $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/kayak-${ENVIRONMENT:-dev}-backend:${BACKEND_IMAGE_TAG:-latest} --push .
echo -e "${GREEN}✓ Backend image pushed${NC}"

# Build and push AI agent
echo -e "\n${YELLOW}Building AI agent image for linux/amd64...${NC}"
cd ../ai-agent
docker buildx build --platform linux/amd64 -t $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/kayak-${ENVIRONMENT:-dev}-agent:${AGENT_IMAGE_TAG:-latest} --push .
echo -e "${GREEN}✓ AI agent image pushed${NC}"

cd ../aws

# Step 5: Deploy with Helm
echo -e "\n${YELLOW}Step 5: Deploying with Helm...${NC}"

# Check if release exists
if helm list -n $NAMESPACE | grep -q "^$RELEASE_NAME"; then
    echo -e "${YELLOW}Upgrading existing release...${NC}"
    helm upgrade $RELEASE_NAME $CHART_PATH \
        --namespace $NAMESPACE \
        --set global.imageRegistry=$AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com \
        --set frontend.image.tag=${FRONTEND_IMAGE_TAG:-latest} \
        --set apiGateway.image.tag=${BACKEND_IMAGE_TAG:-latest} \
        --set listingsService.image.tag=${BACKEND_IMAGE_TAG:-latest} \
        --set bookingsService.image.tag=${BACKEND_IMAGE_TAG:-latest} \
        --set paymentsService.image.tag=${BACKEND_IMAGE_TAG:-latest} \
        --set aiAgent.image.tag=${AGENT_IMAGE_TAG:-latest} \
        --wait \
        --timeout 10m
    echo -e "${GREEN}✓ Release upgraded${NC}"
else
    echo -e "${YELLOW}Installing new release...${NC}"
    helm install $RELEASE_NAME $CHART_PATH \
        --namespace $NAMESPACE \
        --set global.imageRegistry=$AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com \
        --set frontend.image.tag=${FRONTEND_IMAGE_TAG:-latest} \
        --set apiGateway.image.tag=${BACKEND_IMAGE_TAG:-latest} \
        --set listingsService.image.tag=${BACKEND_IMAGE_TAG:-latest} \
        --set bookingsService.image.tag=${BACKEND_IMAGE_TAG:-latest} \
        --set paymentsService.image.tag=${BACKEND_IMAGE_TAG:-latest} \
        --set aiAgent.image.tag=${AGENT_IMAGE_TAG:-latest} \
        --wait \
        --timeout 10m
    echo -e "${GREEN}✓ Release installed${NC}"
fi

# Step 6: Verify deployment
echo -e "\n${YELLOW}Step 6: Verifying deployment...${NC}"

echo -e "\n${YELLOW}Pods:${NC}"
kubectl get pods -n $NAMESPACE

echo -e "\n${YELLOW}Services:${NC}"
kubectl get svc -n $NAMESPACE

echo -e "\n${YELLOW}Ingress:${NC}"
kubectl get ingress -n $NAMESPACE

# Wait for pods to be ready
echo -e "\n${YELLOW}Waiting for pods to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=$RELEASE_NAME -n $NAMESPACE --timeout=300s

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Check pod status: ${GREEN}kubectl get pods -n $NAMESPACE${NC}"
echo -e "2. View logs: ${GREEN}kubectl logs -f -n $NAMESPACE -l app.kubernetes.io/component=api-gateway${NC}"
echo -e "3. Get ingress URL: ${GREEN}kubectl get ingress -n $NAMESPACE${NC}"
echo -e "4. Access application via the ingress URL once DNS is configured"

echo -e "\n${YELLOW}Useful commands:${NC}"
echo -e "- Scale service: ${GREEN}kubectl scale deployment listings-service --replicas=5 -n $NAMESPACE${NC}"
echo -e "- Rollback: ${GREEN}helm rollback $RELEASE_NAME -n $NAMESPACE${NC}"
echo -e "- Uninstall: ${GREEN}helm uninstall $RELEASE_NAME -n $NAMESPACE${NC}"
