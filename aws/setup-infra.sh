#!/bin/bash

# Kayak Infrastructure Setup Script
# This script provisions AWS infrastructure using Terraform

set -e

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo "Error: .env file not found"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Kayak Infrastructure Setup${NC}"
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

if ! command_exists terraform; then
    echo -e "${RED}Error: Terraform is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites met${NC}"

# Verify AWS credentials
echo -e "\n${YELLOW}Verifying AWS credentials...${NC}"
if aws sts get-caller-identity > /dev/null 2>&1; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo -e "${GREEN}✓ AWS credentials verified (Account: $ACCOUNT_ID)${NC}"
else
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    exit 1
fi

# Initialize Terraform
echo -e "\n${YELLOW}Step 1: Initializing Terraform...${NC}"
terraform init
echo -e "${GREEN}✓ Terraform initialized${NC}"

# Validate Terraform configuration
echo -e "\n${YELLOW}Step 2: Validating Terraform configuration...${NC}"
terraform validate
echo -e "${GREEN}✓ Terraform configuration valid${NC}"

# Plan infrastructure changes
echo -e "\n${YELLOW}Step 3: Planning infrastructure changes...${NC}"
terraform plan -out=tfplan
echo -e "${GREEN}✓ Terraform plan generated${NC}"

# Prompt for confirmation
echo -e "\n${YELLOW}Review the plan above. Do you want to apply these changes? (yes/no)${NC}"
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    rm -f tfplan
    exit 0
fi

# Apply infrastructure changes
echo -e "\n${YELLOW}Step 4: Applying infrastructure changes...${NC}"
terraform apply tfplan
rm -f tfplan
echo -e "${GREEN}✓ Infrastructure provisioned${NC}"

# Get outputs
echo -e "\n${YELLOW}Step 5: Getting infrastructure outputs...${NC}"
EKS_CLUSTER_NAME=$(terraform output -raw eks_cluster_name 2>/dev/null || echo "kayak-${ENVIRONMENT:-dev}-cluster")
EKS_CLUSTER_ENDPOINT=$(terraform output -raw eks_cluster_endpoint 2>/dev/null || echo "N/A")
ECR_FRONTEND_URL=$(terraform output -raw ecr_frontend_repository_url 2>/dev/null || echo "N/A")
ECR_BACKEND_URL=$(terraform output -raw ecr_backend_repository_url 2>/dev/null || echo "N/A")
ECR_AGENT_URL=$(terraform output -raw ecr_agent_repository_url 2>/dev/null || echo "N/A")

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Infrastructure Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}Infrastructure Details:${NC}"
echo -e "EKS Cluster Name: ${GREEN}$EKS_CLUSTER_NAME${NC}"
echo -e "EKS Cluster Endpoint: ${GREEN}$EKS_CLUSTER_ENDPOINT${NC}"
echo -e "Frontend ECR: ${GREEN}$ECR_FRONTEND_URL${NC}"
echo -e "Backend ECR: ${GREEN}$ECR_BACKEND_URL${NC}"
echo -e "Agent ECR: ${GREEN}$ECR_AGENT_URL${NC}"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "1. Configure kubectl: ${GREEN}aws eks update-kubeconfig --name $EKS_CLUSTER_NAME --region ${AWS_REGION:-us-east-1}${NC}"
echo -e "2. Verify cluster: ${GREEN}kubectl get nodes${NC}"
echo -e "3. Deploy application: ${GREEN}./deploy-helm.sh${NC}"

echo -e "\n${YELLOW}Useful Commands:${NC}"
echo -e "- View Terraform state: ${GREEN}terraform show${NC}"
echo -e "- Destroy infrastructure: ${GREEN}terraform destroy${NC}"
echo -e "- Update infrastructure: ${GREEN}terraform apply${NC}"
