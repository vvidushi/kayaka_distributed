#!/bin/bash

# ============================================
# Terraform Infrastructure Status Check
# ============================================

set -e

echo "Terraform Infrastructure Status Check"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check Terraform installation
if ! command -v terraform &> /dev/null; then
    echo -e "${YELLOW}WARNING: Terraform not found in PATH${NC}"
    echo ""
    echo "To install Terraform:"
    echo "  macOS: brew install terraform"
    echo "  Or download from: https://www.terraform.io/downloads"
    echo ""
    echo "Checking infrastructure via AWS CLI instead..."
    echo ""
    USE_AWS_CLI=true
else
    TERRAFORM_VERSION=$(terraform version -json 2>/dev/null | grep -o '"terraform_version":"[^"]*"' | cut -d'"' -f4 || terraform version | head -1)
    echo -e "${GREEN}OK: Terraform installed: $TERRAFORM_VERSION${NC}"
    USE_AWS_CLI=false
fi

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}ERROR: AWS CLI not found${NC}"
    exit 1
fi

# Load AWS profile from .env if available
if [ -f .env ]; then
    source .env
    AWS_PROFILE="${AWS_PROFILE:-account2}"
    AWS_REGION="${AWS_REGION:-us-east-1}"
else
    AWS_PROFILE="${AWS_PROFILE:-account2}"
    AWS_REGION="${AWS_REGION:-us-east-1}"
fi

echo -e "${BLUE}AWS Profile:${NC} $AWS_PROFILE"
echo -e "${BLUE}AWS Region:${NC} $AWS_REGION"
echo ""

# ============================================
# Check via Terraform (if available)
# ============================================
if [ "$USE_AWS_CLI" = false ]; then
    cd infra/aws
    
    # Check if terraform is initialized
    if [ -d .terraform ]; then
        echo -e "${GREEN}OK: Terraform initialized${NC}"
        
        # Check terraform state
        if [ -f terraform.tfstate ] || [ -f terraform.tfstate.backup ]; then
            echo -e "${GREEN}OK: Terraform state file exists${NC}"
            
            # Get current state
            echo ""
            echo "Current Terraform State:"
            terraform show -json 2>/dev/null | jq -r '.values.root_module.resources[]? | "\(.type).\(.name): \(.values.id // .values.name // "N/A")"' 2>/dev/null | head -20 || echo "  (Unable to parse state)"
        else
            echo -e "${YELLOW}WARNING: No Terraform state file found${NC}"
            echo "  This means infrastructure may not be deployed yet."
        fi
        
        # Check outputs
        echo ""
        echo "Terraform Outputs:"
        terraform output 2>/dev/null || echo "  (No outputs available)"
        
        cd ..
    else
        echo -e "${YELLOW}WARNING: Terraform not initialized${NC}"
        echo "  Run: cd infra/aws && terraform init"
    fi
fi

echo ""
echo "=========================================="
echo "Infrastructure Status (via AWS CLI)"
echo "=========================================="
echo ""

# Check EKS Cluster
echo "EKS Clusters:"
CLUSTER_LIST=$(aws eks list-clusters --region "$AWS_REGION" --profile "$AWS_PROFILE" --output json 2>&1 | grep -o '"[^"]*"' | grep -v "clusters" | tr -d '"' || echo "")
if [ -n "$CLUSTER_LIST" ]; then
    for cluster in $CLUSTER_LIST; do
        CLUSTER_INFO=$(aws eks describe-cluster --name "$cluster" --region "$AWS_REGION" --profile "$AWS_PROFILE" --output json 2>&1)
        STATUS=$(echo "$CLUSTER_INFO" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
        VERSION=$(echo "$CLUSTER_INFO" | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
        if [ "$STATUS" = "ACTIVE" ]; then
            echo -e "  ${GREEN}OK: $cluster${NC} - Status: $STATUS, Version: $VERSION"
        else
            echo -e "  ${YELLOW}WARNING: $cluster${NC} - Status: $STATUS, Version: $VERSION"
        fi
    done
else
    echo -e "  ${RED}ERROR: No EKS clusters found${NC}"
fi

echo ""
echo "ECR Repositories:"
REPO_LIST=$(aws ecr describe-repositories --region "$AWS_REGION" --profile "$AWS_PROFILE" --output json 2>&1 | grep -o '"repositoryName":"[^"]*"' | cut -d'"' -f4 || echo "")
KAYAK_REPOS=""
if [ -n "$REPO_LIST" ]; then
    for repo in $REPO_LIST; do
        if echo "$repo" | grep -q "kayak"; then
            echo -e "  ${GREEN}OK: $repo${NC}"
            KAYAK_REPOS="$KAYAK_REPOS $repo"
        fi
    done
    if [ -z "$KAYAK_REPOS" ]; then
        echo -e "  ${YELLOW}WARNING: No kayak repositories found${NC}"
    fi
else
    echo -e "  ${RED}ERROR: No ECR repositories found${NC}"
fi

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""

# Count resources
CLUSTER_COUNT=$(echo "$CLUSTER_LIST" | wc -w | tr -d ' ')
KAYAK_REPO_COUNT=$(echo "$KAYAK_REPOS" | wc -w | tr -d ' ')

if [ "$CLUSTER_COUNT" -gt 0 ] && [ "$KAYAK_REPO_COUNT" -gt 0 ]; then
    echo -e "${GREEN}OK: Infrastructure appears to be deployed${NC}"
    echo "  - EKS Clusters: $CLUSTER_COUNT"
    echo "  - Kayak ECR Repos: $KAYAK_REPO_COUNT"
else
    echo -e "${YELLOW}WARNING: Infrastructure may not be fully deployed${NC}"
    echo "  - EKS Clusters: $CLUSTER_COUNT"
    echo "  - Kayak ECR Repos: $KAYAK_REPO_COUNT"
fi

echo ""
echo "To redeploy infrastructure:"
echo "  1. cd infra/aws"
echo "  2. terraform init"
echo "  3. terraform plan"
echo "  4. terraform apply"

