# Project Configuration
variable "project" {
  description = "Project name"
  type        = string
  default     = "kayak"
}

variable "environment" {
  description = "Environment (dev/staging/prod)"
  type        = string
  default     = "dev"
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# AWS Profile
variable "aws_profile" {
  description = "AWS CLI profile from .env"
  type        = string
  default     = "account2"
}

variable "aws_account_id" {
  description = "AWS Account ID"
  type        = string
  default     = ""
}

# Networking
variable "vpc_id" {
  description = "VPC ID for EKS cluster"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for EKS nodes"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for ALB"
  type        = list(string)
}

# EKS Configuration
variable "cluster_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "cluster_endpoint_public_access" {
  description = "Enable public access to cluster endpoint"
  type        = bool
  default     = true
}

variable "cluster_endpoint_private_access" {
  description = "Enable private access to cluster endpoint"
  type        = bool
  default     = true
}

# Node Group
variable "node_instance_types" {
  description = "EC2 instance types for nodes"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_desired_size" {
  description = "Desired number of nodes"
  type        = number
  default     = 3
}

variable "node_min_size" {
  description = "Minimum number of nodes"
  type        = number
  default     = 2
}

variable "node_max_size" {
  description = "Maximum number of nodes"
  type        = number
  default     = 6
}

variable "node_disk_size" {
  description = "Disk size for nodes (GB)"
  type        = number
  default     = 30
}

# ECR
variable "ecr_repositories" {
  description = "ECR repositories to create"
  type        = list(string)
  default     = ["kayak-frontend", "kayak-backend", "kayak-agent"]
}

variable "ecr_image_tag_mutability" {
  description = "Image tag mutability"
  type        = string
  default     = "MUTABLE"
}

variable "ecr_scan_on_push" {
  description = "Enable ECR scanning"
  type        = bool
  default     = true
}

# Application Configuration
variable "frontend_replicas" {
  description = "Frontend pod replicas"
  type        = number
  default     = 2
}

variable "backend_replicas" {
  description = "Backend pod replicas"
  type        = number
  default     = 2
}

variable "agent_replicas" {
  description = "Agent pod replicas"
  type        = number
  default     = 1
}

variable "frontend_image_tag" {
  description = "Frontend image tag"
  type        = string
  default     = "latest"
}

variable "backend_image_tag" {
  description = "Backend image tag"
  type        = string
  default     = "latest"
}

variable "agent_image_tag" {
  description = "Agent image tag"
  type        = string
  default     = "latest"
}

# Monitoring
variable "enable_cloudwatch_logs" {
  description = "Enable CloudWatch logs"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Log retention days"
  type        = number
  default     = 7
}

# Optional
variable "msk_cluster_arn" {
  description = "MSK cluster ARN (optional)"
  type        = string
  default     = ""
}

variable "msk_bootstrap_brokers" {
  description = "MSK bootstrap brokers (optional)"
  type        = string
  default     = ""
}

variable "domain_name" {
  description = "Domain name (optional)"
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "ACM certificate ARN (optional)"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}
