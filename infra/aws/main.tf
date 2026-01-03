# ============================================
# Kayak EKS Infrastructure - Main Configuration
# ============================================

# Terraform & Provider Configuration
terraform {
  required_version = ">= 1.5"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region  = var.region
  profile = var.aws_profile
  
  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data Sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Local Values
locals {
  name_prefix = "${var.project}-${var.environment}"
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# ============================================
# EKS Cluster
# ============================================
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = local.name_prefix
  cluster_version = var.cluster_version
  vpc_id          = var.vpc_id
  subnet_ids      = var.private_subnet_ids

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  cluster_addons = {
    coredns    = { most_recent = true }
    kube-proxy = { most_recent = true }
    vpc-cni    = { most_recent = true }
    # aws-ebs-csi-driver = { most_recent = true }  # Disabled - needs IAM role, not needed for basic deployment
  }

  eks_managed_node_groups = {
    main = {
      name           = "${local.name_prefix}-nodes"
      instance_types = var.node_instance_types
      min_size       = var.node_min_size
      max_size       = var.node_max_size
      desired_size   = var.node_desired_size
      disk_size      = var.node_disk_size
      
      labels = {
        Environment = var.environment
        Project     = var.project
      }
      
      tags = local.common_tags
    }
  }

  enable_irsa = true
  tags        = local.common_tags
}

# ============================================
# Application Modules
# ============================================

# Frontend
module "frontend" {
  source          = "./modules/frontend"
  repository_name = "${local.name_prefix}-frontend"
  replicas        = var.frontend_replicas
  image_tag       = var.frontend_image_tag
  common_tags     = local.common_tags
  depends_on      = [module.eks]
}

# Backend
module "backend" {
  source          = "./modules/backend"
  repository_name = "${local.name_prefix}-backend"
  replicas        = var.backend_replicas
  image_tag       = var.backend_image_tag
  common_tags     = local.common_tags
  depends_on      = [module.eks]
}

# Agent (Agentic AI)
module "agent" {
  source          = "./modules/agent"
  repository_name = "${local.name_prefix}-agent"
  replicas        = var.agent_replicas
  image_tag       = var.agent_image_tag
  common_tags     = local.common_tags
  depends_on      = [module.eks]
}
