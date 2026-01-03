variable "repository_name" {
  description = "ECR repository name"
  type        = string
}

variable "replicas" {
  description = "Number of pod replicas"
  type        = number
  default     = 1
}

variable "image_tag" {
  description = "Docker image tag"
  type        = string
  default     = "latest"
}

variable "common_tags" {
  description = "Common tags"
  type        = map(string)
  default     = {}
}

