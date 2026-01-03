# Infrastructure - Production Terraform

Clean, standard Terraform structure for EKS deployment.

## Structure

```
infra/aws/
├── main.tf              # Everything (providers, EKS, modules)
├── variables.tf         # Variable definitions
├── terraform.tfvars     # Your values
├── outputs.tf           # Outputs
└── modules/
    ├── frontend/
    ├── backend/
    └── agent/          # Agentic AI
```

## Usage

```bash
cd infra/aws

# 1. Update terraform.tfvars with your VPC/Subnet IDs
# 2. Deploy
terraform init
terraform plan
terraform apply
```

## What Gets Created

- EKS Cluster
- Frontend ECR Repository
- Backend ECR Repository
- Agent ECR Repository (Agentic AI)

---

**Simple. Clean. Standard.** 
