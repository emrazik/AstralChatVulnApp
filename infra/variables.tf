variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project prefix"
  type        = string
  default     = "astralchat"
}

variable "enable_amplify_hosting" {
  description = "Create Amplify app + branch wired to GitHub. Requires a valid PAT or GitHub returns 401."
  type        = bool
  default     = false
}

variable "github_repository_url" {
  description = "HTTPS GitHub repo URL (required when enable_amplify_hosting is true)"
  type        = string
  default     = ""
}

variable "github_access_token" {
  description = "GitHub PAT: classic with repo scope, or fine-grained with Contents+Metadata read and Webhooks read/write on the repo"
  type        = string
  default     = ""
  sensitive   = true
}

variable "bedrock_generation_model_arn" {
  description = "Foundation model ARN for response generation"
  type        = string
}

variable "bedrock_embedding_model_arn" {
  description = "Embedding model ARN for the KB"
  type        = string
}

variable "bedrock_embedding_dimensions" {
  description = "Vector size for the OpenSearch Serverless index; must match the embedding model (1024 for Titan Text Embeddings v2 default; 1536 for Titan G1; 1024 for Cohere embed)"
  type        = number
  default     = 1024
}
