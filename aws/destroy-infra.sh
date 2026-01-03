#!/bin/bash

# Kayak Infrastructure Destroy Script
# This script destroys AWS infrastructure provisioned by Terraform

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

echo -e "${RED}========================================${NC}"
echo -e "${RED}Kayak Infrastructure Destruction${NC}"
echo -e "${RED}========================================${NC}"

echo -e "\n${RED}WARNING: This will destroy all infrastructure!${NC}"
echo -e "${YELLOW}This includes:${NC}"
echo -e "  - EKS Cluster"
echo -e "  - ECR Repositories (and all images)"
echo -e "  - VPC and networking resources"
echo -e "  - Load balancers"
echo -e "  - All deployed applications"

echo -e "\n${RED}Are you absolutely sure you want to continue? (type 'destroy' to confirm)${NC}"
read -r CONFIRM

if [ "$CONFIRM" != "destroy" ]; then
    echo -e "${GREEN}Destruction cancelled${NC}"
    exit 0
fi

# Uninstall Helm releases first
NAMESPACE="kayak-${ENVIRONMENT:-dev}"
echo -e "\n${YELLOW}Step 1: Uninstalling Helm releases...${NC}"

if command -v helm >/dev/null 2>&1 && command -v kubectl >/dev/null 2>&1; then
    # Configure kubectl
    CLUSTER_NAME="kayak-${ENVIRONMENT:-dev}"
    aws eks update-kubeconfig --name $CLUSTER_NAME --region ${AWS_REGION:-us-east-1} 2>/dev/null || true
    
    # Check if namespace exists
    if kubectl get namespace $NAMESPACE >/dev/null 2>&1; then
        echo -e "${YELLOW}Uninstalling Helm release...${NC}"
        helm uninstall kayak -n $NAMESPACE 2>/dev/null || true
        
        echo -e "${YELLOW}Deleting namespace...${NC}"
        kubectl delete namespace $NAMESPACE --timeout=60s 2>/dev/null || true
        
        echo -e "${GREEN}✓ Helm releases uninstalled${NC}"
    else
        echo -e "${YELLOW}No Helm releases found${NC}"
    fi
else
    echo -e "${YELLOW}kubectl/helm not available, skipping Helm cleanup${NC}"
fi

# Destroy Terraform infrastructure
echo -e "\n${YELLOW}Step 2: Destroying Terraform infrastructure...${NC}"
terraform destroy -auto-approve

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Infrastructure Destroyed Successfully${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}Cleanup complete. You may want to:${NC}"
echo -e "1. Remove local kubeconfig: ${GREEN}kubectl config delete-context <context-name>${NC}"
echo -e "2. Clean up local Terraform state: ${GREEN}rm -rf .terraform terraform.tfstate*${NC}"
