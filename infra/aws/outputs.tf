# ============================================
# Outputs
# ============================================

# EKS Cluster
output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

# Frontend
output "frontend_ecr_url" {
  description = "Frontend ECR repository URL"
  value       = module.frontend.repository_url
}

output "frontend_image" {
  description = "Frontend full image path"
  value       = "${module.frontend.repository_url}:${var.frontend_image_tag}"
}

# Backend
output "backend_ecr_url" {
  description = "Backend ECR repository URL"
  value       = module.backend.repository_url
}

output "backend_image" {
  description = "Backend full image path"
  value       = "${module.backend.repository_url}:${var.backend_image_tag}"
}

# Agent
output "agent_ecr_url" {
  description = "Agent ECR repository URL"
  value       = module.agent.repository_url
}

output "agent_image" {
  description = "Agent full image path"
  value       = "${module.agent.repository_url}:${var.agent_image_tag}"
}

# Helper Commands
output "configure_kubectl" {
  description = "Command to configure kubectl"
  value       = "aws eks update-kubeconfig --region ${var.region} --name ${module.eks.cluster_name} --profile ${var.aws_profile}"
}

output "ecr_login" {
  description = "Command to login to ECR"
  value       = "aws ecr get-login-password --region ${var.region} --profile ${var.aws_profile} | docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.region}.amazonaws.com"
}

