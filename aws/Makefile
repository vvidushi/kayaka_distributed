.PHONY: help init plan apply deploy destroy clean status logs shell test

# Default target
.DEFAULT_GOAL := help

# Load environment variables
include .env
export

# Unset potentially conflicting AWS credentials from .env
unexport AWS_ACCESS_KEY_ID
unexport AWS_SECRET_ACCESS_KEY

# Variables
NAMESPACE := kayak-$(ENVIRONMENT)
CHART_PATH := ./helm/kayak
RELEASE_NAME := kayak
REGION := $(AWS_REGION)
CLUSTER_NAME := kayak-$(ENVIRONMENT)

# Colors
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m # No Color

##@ Help

help: ## Display this help message
	@echo "$(GREEN)Kayak Infrastructure & Deployment$(NC)"
	@echo "$(GREEN)=================================$(NC)"
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Infrastructure Setup

init: ## Initialize Terraform
	@echo "$(YELLOW)Initializing Terraform...$(NC)"
	@terraform init
	@echo "$(GREEN)✓ Terraform initialized$(NC)"

validate: ## Validate Terraform configuration
	@echo "$(YELLOW)Validating Terraform configuration...$(NC)"
	@terraform validate
	@echo "$(GREEN)✓ Configuration valid$(NC)"

plan: init validate ## Plan infrastructure changes
	@echo "$(YELLOW)Planning infrastructure changes...$(NC)"
	@terraform plan -out=tfplan
	@echo "$(GREEN)✓ Plan generated$(NC)"

apply: plan ## Apply infrastructure changes
	@echo "$(YELLOW)Applying infrastructure changes...$(NC)"
	@terraform apply tfplan
	@rm -f tfplan
	@echo "$(GREEN)✓ Infrastructure provisioned$(NC)"

setup: apply ## Complete infrastructure setup
	@./setup-infra.sh

destroy-infra: ## Destroy Terraform infrastructure (WARNING: destructive)
	@echo "$(RED)WARNING: This will destroy all infrastructure!$(NC)"
	@read -p "Type 'destroy' to confirm: " confirm; \
	if [ "$$confirm" = "destroy" ]; then \
		./destroy-infra.sh; \
	else \
		echo "$(GREEN)Destruction cancelled$(NC)"; \
	fi

##@ Kubernetes & Helm

configure-kubectl: ## Configure kubectl for EKS
	@echo "$(YELLOW)Configuring kubectl...$(NC)"
	@aws eks update-kubeconfig --name $(CLUSTER_NAME) --region $(REGION)
	@echo "$(GREEN)✓ kubectl configured$(NC)"

create-namespace: configure-kubectl ## Create Kubernetes namespace
	@echo "$(YELLOW)Creating namespace...$(NC)"
	@unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; kubectl get namespace $(NAMESPACE) > /dev/null 2>&1 || kubectl create namespace $(NAMESPACE)
	@echo "$(GREEN)✓ Namespace $(NAMESPACE) ready$(NC)"

create-secrets-only: ## Create Kubernetes secrets without creating namespace
	@echo "$(YELLOW)Creating secrets...$(NC)"
	@if unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; kubectl get secret kayak-backend-secrets -n $(NAMESPACE) > /dev/null 2>&1; then \
		echo "$(GREEN)✓ Backend secrets already exist$(NC)"; \
	else \
		echo "$(YELLOW)Creating backend secrets...$(NC)"; \
		unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; kubectl create secret generic kayak-backend-secrets \
			--namespace=$(NAMESPACE) \
			--from-literal=DATABASE_URL="$$(grep '^DATABASE_URL=' ../backend/.env | cut -d '=' -f2-)" \
			--from-literal=MONGODB_URI="$$(grep '^MONGODB_URI=' ../backend/.env | cut -d '=' -f2-)" \
			--from-literal=REDIS_URL="$$(grep '^REDIS_URL=' ../backend/.env | cut -d '=' -f2-)" \
			--from-literal=JWT_SECRET="$$(grep '^JWT_SECRET=' ../backend/.env | cut -d '=' -f2-)" \
			--from-literal=JWT_EXPIRES_IN="$$(grep '^JWT_EXPIRES_IN=' ../backend/.env | cut -d '=' -f2-)" \
			--from-literal=SESSION_SECRET="$$(grep '^SESSION_SECRET=' ../backend/.env | cut -d '=' -f2-)" \
			--from-literal=SESSION_MAX_AGE="$$(grep '^SESSION_MAX_AGE=' ../backend/.env | cut -d '=' -f2-)" \
			--from-literal=FIREBASE_SERVICE_ACCOUNT="$$(grep '^FIREBASE_SERVICE_ACCOUNT=' ../backend/.env | cut -d '=' -f2-)" \
			--from-literal=FIREBASE_STORAGE_BUCKET="$$(grep '^FIREBASE_STORAGE_BUCKET=' ../backend/.env | cut -d '=' -f2-)"; \
		echo "$(GREEN)✓ Backend secrets created$(NC)"; \
	fi
	@if unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; kubectl get secret kayak-agent-secrets -n $(NAMESPACE) > /dev/null 2>&1; then \
		echo "$(GREEN)✓ Agent secrets already exist$(NC)"; \
	else \
		echo "$(YELLOW)Creating agent secrets...$(NC)"; \
		unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; kubectl create secret generic kayak-agent-secrets \
			--namespace=$(NAMESPACE) \
			--from-literal=OPENAI_API_KEY="$$(grep '^OPENAI_API_KEY=' ../ai-agent/.env | cut -d '=' -f2-)" \
			--from-literal=TAVILY_API_KEY="$$(grep '^TAVILY_API_KEY=' ../ai-agent/.env | cut -d '=' -f2-)" \
			--from-literal=WEATHER_API_KEY="$$(grep '^WEATHER_API_KEY=' ../ai-agent/.env | cut -d '=' -f2-)" \
			--from-literal=LANGSMITH_API_KEY="$$(grep '^LANGSMITH_API_KEY=' ../ai-agent/.env | cut -d '=' -f2-)" \
			--from-literal=LANGCHAIN_API_KEY="$$(grep '^LANGCHAIN_API_KEY=' ../ai-agent/.env | cut -d '=' -f2-)" \
			--from-literal=SUPABASE_ACCESS_TOKEN="$$(grep '^SUPABASE_ACCESS_TOKEN=' ../ai-agent/.env | cut -d '=' -f2-)" \
			--from-literal=SUPABASE_SERVICE_ROLE_KEY="$$(grep '^SUPABASE_SERVICE_ROLE_KEY=' ../ai-agent/.env | cut -d '=' -f2-)" \
			--from-literal=DATABASE_URL="$$(grep '^DATABASE_URL=' ../ai-agent/.env | cut -d '=' -f2-)" \
			--from-literal=SUPABASE_DATABASE_URL="$$(grep '^SUPABASE_DATABASE_URL=' ../ai-agent/.env | cut -d '=' -f2-)" \
			--from-literal=MONGODB_URI="$$(grep '^MONGODB_URI=' ../ai-agent/.env | cut -d '=' -f2-)" \
			--from-literal=REDIS_URL="$$(grep '^REDIS_URL=' ../ai-agent/.env | cut -d '=' -f2-)"; \
		echo "$(GREEN)✓ Agent secrets created$(NC)"; \
	fi

create-secrets: create-namespace ## Create Kubernetes secrets from .env files
	@echo "$(YELLOW)Creating secrets...$(NC)"
	@if unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; kubectl get secret kayak-backend-secrets -n $(NAMESPACE) > /dev/null 2>&1; then \
		echo "$(GREEN)✓ Backend secrets already exist$(NC)"; \
	else \
		echo "$(YELLOW)Creating backend secrets...$(NC)"; \
		unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; kubectl create secret generic kayak-backend-secrets \
			--namespace=$(NAMESPACE) \
			--from-literal=DATABASE_URL="$$(grep '^DATABASE_URL=' ../backend/.env | cut -d '=' -f2-)" \
			--from-literal=MONGODB_URI="$$(grep '^MONGODB_URI=' ../backend/.env | cut -d '=' -f2-)" \
			--from-literal=REDIS_URL="$$(grep '^REDIS_URL=' ../backend/.env | cut -d '=' -f2-)" \
			--from-literal=JWT_SECRET="$$(grep '^JWT_SECRET=' ../backend/.env | cut -d '=' -f2-)" \
			--from-literal=JWT_EXPIRES_IN="$$(grep '^JWT_EXPIRES_IN=' ../backend/.env | cut -d '=' -f2-)" \
			--from-literal=SESSION_SECRET="$$(grep '^SESSION_SECRET=' ../backend/.env | cut -d '=' -f2-)" \
			--from-literal=SESSION_MAX_AGE="$$(grep '^SESSION_MAX_AGE=' ../backend/.env | cut -d '=' -f2-)" \
			--from-literal=FIREBASE_SERVICE_ACCOUNT="$$(grep '^FIREBASE_SERVICE_ACCOUNT=' ../backend/.env | cut -d '=' -f2-)" \
			--from-literal=FIREBASE_STORAGE_BUCKET="$$(grep '^FIREBASE_STORAGE_BUCKET=' ../backend/.env | cut -d '=' -f2-)"; \
		echo "$(GREEN)✓ Backend secrets created$(NC)"; \
	fi
	@if unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; kubectl get secret kayak-agent-secrets -n $(NAMESPACE) > /dev/null 2>&1; then \
		echo "$(GREEN)✓ Agent secrets already exist$(NC)"; \
	else \
		echo "$(YELLOW)Creating agent secrets...$(NC)"; \
		unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; kubectl create secret generic kayak-agent-secrets \
			--namespace=$(NAMESPACE) \
			--from-literal=OPENAI_API_KEY="$$(grep '^OPENAI_API_KEY=' ../ai-agent/.env | cut -d '=' -f2-)" \
			--from-literal=TAVILY_API_KEY="$$(grep '^TAVILY_API_KEY=' ../ai-agent/.env | cut -d '=' -f2-)" \
			--from-literal=WEATHER_API_KEY="$$(grep '^WEATHER_API_KEY=' ../ai-agent/.env | cut -d '=' -f2-)" \
			--from-literal=LANGSMITH_API_KEY="$$(grep '^LANGSMITH_API_KEY=' ../ai-agent/.env | cut -d '=' -f2-)" \
			--from-literal=LANGCHAIN_API_KEY="$$(grep '^LANGCHAIN_API_KEY=' ../ai-agent/.env | cut -d '=' -f2-)" \
			--from-literal=SUPABASE_ACCESS_TOKEN="$$(grep '^SUPABASE_ACCESS_TOKEN=' ../ai-agent/.env | cut -d '=' -f2-)" \
			--from-literal=SUPABASE_SERVICE_ROLE_KEY="$$(grep '^SUPABASE_SERVICE_ROLE_KEY=' ../ai-agent/.env | cut -d '=' -f2-)" \
			--from-literal=DATABASE_URL="$$(grep '^DATABASE_URL=' ../ai-agent/.env | cut -d '=' -f2-)" \
			--from-literal=SUPABASE_DATABASE_URL="$$(grep '^SUPABASE_DATABASE_URL=' ../ai-agent/.env | cut -d '=' -f2-)" \
			--from-literal=MONGODB_URI="$$(grep '^MONGODB_URI=' ../ai-agent/.env | cut -d '=' -f2-)" \
			--from-literal=REDIS_URL="$$(grep '^REDIS_URL=' ../ai-agent/.env | cut -d '=' -f2-)"; \
		echo "$(GREEN)✓ Agent secrets created$(NC)"; \
	fi

##@ Docker Images

ecr-login: ## Login to AWS ECR
	@echo "$(YELLOW)Logging into ECR...$(NC)"
	@aws ecr get-login-password --region $(REGION) | docker login --username AWS --password-stdin $(AWS_ACCOUNT_ID).dkr.ecr.$(REGION).amazonaws.com
	@echo "$(GREEN)✓ Logged into ECR$(NC)"

build-frontend: ecr-login ## Build and push frontend image
	@echo "$(YELLOW)Building frontend image for linux/amd64...$(NC)"
	@cd ../frontend && \
		docker buildx build --platform linux/amd64 -t $(AWS_ACCOUNT_ID).dkr.ecr.$(REGION).amazonaws.com/kayak-$(ENVIRONMENT)-frontend:$(FRONTEND_IMAGE_TAG) --push .
	@echo "$(GREEN)✓ Frontend image pushed$(NC)"

build-backend: ecr-login ## Build and push backend image
	@echo "$(YELLOW)Building backend image for linux/amd64...$(NC)"
	@cd ../backend && \
		docker buildx build --platform linux/amd64 -t $(AWS_ACCOUNT_ID).dkr.ecr.$(REGION).amazonaws.com/kayak-$(ENVIRONMENT)-backend:$(BACKEND_IMAGE_TAG) --push .
	@echo "$(GREEN)✓ Backend image pushed$(NC)"

build-agent: ecr-login ## Build and push AI agent image
	@echo "$(YELLOW)Building AI agent image for linux/amd64...$(NC)"
	@cd ../ai-agent && \
		docker buildx build --platform linux/amd64 -t $(AWS_ACCOUNT_ID).dkr.ecr.$(REGION).amazonaws.com/kayak-$(ENVIRONMENT)-agent:$(AGENT_IMAGE_TAG) --push .
	@echo "$(GREEN)✓ AI agent image pushed$(NC)"

build-all: build-frontend build-backend build-agent ## Build and push all images

##@ Deployment

helm-install: build-all ## Install Helm chart
	@echo "$(YELLOW)Preparing namespace...$(NC)"
	@if unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; kubectl get namespace $(NAMESPACE) > /dev/null 2>&1; then \
		MANAGED_BY=$$(unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; kubectl get namespace $(NAMESPACE) -o jsonpath='{.metadata.labels.app\.kubernetes\.io/managed-by}' 2>/dev/null || echo ""); \
		if [ "$$MANAGED_BY" != "Helm" ]; then \
			echo "$(YELLOW)Namespace exists but not managed by Helm, deleting...$(NC)"; \
			unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; kubectl delete namespace $(NAMESPACE) --wait; \
			echo "$(YELLOW)Waiting for namespace deletion to complete...$(NC)"; \
			for i in 1 2 3 4 5 6 7 8 9 10; do \
				if ! unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; kubectl get namespace $(NAMESPACE) > /dev/null 2>&1; then \
					break; \
				fi; \
				sleep 2; \
			done; \
			echo "$(GREEN)✓ Namespace deleted$(NC)"; \
		else \
			echo "$(GREEN)✓ Namespace already managed by Helm$(NC)"; \
		fi \
	fi
	@echo "$(YELLOW)Installing Helm chart...$(NC)"
	@helm install $(RELEASE_NAME) $(CHART_PATH) \
		--namespace $(NAMESPACE) \
		--create-namespace \
		--set global.imageRegistry=$(AWS_ACCOUNT_ID).dkr.ecr.$(REGION).amazonaws.com \
		--set frontend.image.tag=$(FRONTEND_IMAGE_TAG) \
		--set apiGateway.image.tag=$(BACKEND_IMAGE_TAG) \
		--set listingsService.image.tag=$(BACKEND_IMAGE_TAG) \
		--set bookingsService.image.tag=$(BACKEND_IMAGE_TAG) \
		--set paymentsService.image.tag=$(BACKEND_IMAGE_TAG) \
		--set aiAgent.image.tag=$(AGENT_IMAGE_TAG) \
		--wait \
		--timeout 10m
	@echo "$(GREEN)✓ Helm chart installed$(NC)"
	@$(MAKE) create-secrets-only

helm-upgrade: build-all ## Upgrade Helm chart
	@echo "$(YELLOW)Upgrading Helm chart...$(NC)"
	@helm upgrade $(RELEASE_NAME) $(CHART_PATH) \
		--namespace $(NAMESPACE) \
		--set global.imageRegistry=$(AWS_ACCOUNT_ID).dkr.ecr.$(REGION).amazonaws.com \
		--set frontend.image.tag=$(FRONTEND_IMAGE_TAG) \
		--set apiGateway.image.tag=$(BACKEND_IMAGE_TAG) \
		--set listingsService.image.tag=$(BACKEND_IMAGE_TAG) \
		--set bookingsService.image.tag=$(BACKEND_IMAGE_TAG) \
		--set paymentsService.image.tag=$(BACKEND_IMAGE_TAG) \
		--set aiAgent.image.tag=$(AGENT_IMAGE_TAG) \
		--wait \
		--timeout 10m
	@echo "$(GREEN)✓ Helm chart upgraded$(NC)"

deploy: ## Full deployment (build + helm install/upgrade)
	@./deploy-helm.sh

helm-uninstall: ## Uninstall Helm chart
	@echo "$(YELLOW)Uninstalling Helm chart...$(NC)"
	@helm uninstall $(RELEASE_NAME) -n $(NAMESPACE) || true
	@echo "$(GREEN)✓ Helm chart uninstalled$(NC)"

helm-rollback: ## Rollback Helm release to previous version
	@echo "$(YELLOW)Rolling back Helm release...$(NC)"
	@helm rollback $(RELEASE_NAME) -n $(NAMESPACE)
	@echo "$(GREEN)✓ Rollback complete$(NC)"

##@ Monitoring & Debugging

status: configure-kubectl ## Show deployment status
	@echo "$(YELLOW)Deployment Status:$(NC)"
	@echo ""
	@echo "$(YELLOW)Pods:$(NC)"
	@kubectl get pods -n $(NAMESPACE)
	@echo ""
	@echo "$(YELLOW)Services:$(NC)"
	@kubectl get svc -n $(NAMESPACE)
	@echo ""
	@echo "$(YELLOW)Ingress:$(NC)"
	@kubectl get ingress -n $(NAMESPACE)
	@echo ""
	@echo "$(YELLOW)Helm Releases:$(NC)"
	@helm list -n $(NAMESPACE)

logs: configure-kubectl ## Show logs (usage: make logs SERVICE=api-gateway)
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)Error: SERVICE not specified. Usage: make logs SERVICE=api-gateway$(NC)"; \
		exit 1; \
	fi
	@kubectl logs -f -n $(NAMESPACE) -l app.kubernetes.io/component=$(SERVICE)

logs-all: configure-kubectl ## Show all pod logs
	@kubectl logs -n $(NAMESPACE) --all-containers=true --tail=100

describe-pod: configure-kubectl ## Describe a pod (usage: make describe-pod POD=frontend-xxx)
	@if [ -z "$(POD)" ]; then \
		echo "$(RED)Error: POD not specified. Usage: make describe-pod POD=frontend-xxx$(NC)"; \
		exit 1; \
	fi
	@kubectl describe pod $(POD) -n $(NAMESPACE)

shell: configure-kubectl ## Get shell in a pod (usage: make shell POD=frontend-xxx)
	@if [ -z "$(POD)" ]; then \
		echo "$(RED)Error: POD not specified. Usage: make shell POD=frontend-xxx$(NC)"; \
		exit 1; \
	fi
	@kubectl exec -it $(POD) -n $(NAMESPACE) -- /bin/sh

events: configure-kubectl ## Show cluster events
	@kubectl get events -n $(NAMESPACE) --sort-by='.lastTimestamp'

top: configure-kubectl ## Show resource usage
	@echo "$(YELLOW)Node Resources:$(NC)"
	@kubectl top nodes
	@echo ""
	@echo "$(YELLOW)Pod Resources:$(NC)"
	@kubectl top pods -n $(NAMESPACE)

##@ Scaling

scale: configure-kubectl ## Scale a deployment (usage: make scale SERVICE=listings REPLICAS=5)
	@if [ -z "$(SERVICE)" ] || [ -z "$(REPLICAS)" ]; then \
		echo "$(RED)Error: SERVICE and REPLICAS required. Usage: make scale SERVICE=listings REPLICAS=5$(NC)"; \
		exit 1; \
	fi
	@kubectl scale deployment $(SERVICE)-service --replicas=$(REPLICAS) -n $(NAMESPACE)
	@echo "$(GREEN)✓ Scaled $(SERVICE)-service to $(REPLICAS) replicas$(NC)"

##@ Cleanup

clean-secrets: configure-kubectl ## Delete secrets
	@echo "$(YELLOW)Deleting secrets...$(NC)"
	@kubectl delete secret kayak-backend-secrets -n $(NAMESPACE) --ignore-not-found=true
	@kubectl delete secret kayak-agent-secrets -n $(NAMESPACE) --ignore-not-found=true
	@echo "$(GREEN)✓ Secrets deleted$(NC)"

clean-namespace: helm-uninstall ## Delete namespace
	@echo "$(YELLOW)Deleting namespace...$(NC)"
	@kubectl delete namespace $(NAMESPACE) --timeout=60s || true
	@echo "$(GREEN)✓ Namespace deleted$(NC)"

clean: clean-namespace ## Clean up Kubernetes resources
	@echo "$(GREEN)✓ Cleanup complete$(NC)"

destroy: clean destroy-infra ## Destroy everything (Kubernetes + Infrastructure)

##@ Terraform Outputs

outputs: ## Show Terraform outputs
	@terraform output

##@ Quick Commands

all: setup deploy status ## Complete setup and deployment
	@echo "$(GREEN)✓ Complete deployment finished!$(NC)"

restart: configure-kubectl ## Restart all pods
	@echo "$(YELLOW)Restarting all deployments...$(NC)"
	@kubectl rollout restart deployment -n $(NAMESPACE)
	@echo "$(GREEN)✓ All deployments restarted$(NC)"

update: helm-upgrade status ## Update application (rebuild images + upgrade helm)
	@echo "$(GREEN)✓ Update complete!$(NC)"

quick-deploy: build-all helm-upgrade ## Quick deploy (skip secrets)
	@echo "$(GREEN)✓ Quick deployment complete!$(NC)"
