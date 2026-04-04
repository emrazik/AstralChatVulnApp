terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
    null = {
      source  = "hashicorp/null"
      version = ">= 3.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  app_name             = "${var.project_name}-app"
  kb_vector_index_name = "astralchat-index"
  # Data access policy expects IAM role ARNs; map STS assumed-role to iam role ARN when needed.
  caller_arn                    = data.aws_caller_identity.current.arn
  deployer_opensearch_principal = length(regexall("^arn:aws:sts::", local.caller_arn)) > 0 ? regexreplace(local.caller_arn, "^arn:aws:sts::(\\d+):assumed-role/([^/]+)/.*$", "arn:aws:iam::$1:role/$2") : local.caller_arn
}

resource "aws_s3_bucket" "kb_data" {
  bucket        = "${var.project_name}-kb-${data.aws_caller_identity.current.account_id}"
  force_destroy = true
}

resource "aws_s3_bucket_versioning" "kb_data" {
  bucket = aws_s3_bucket.kb_data.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Versioned buckets still fail DeleteBucket unless every object version is removed first.
# force_destroy alone is not reliable for versioned buckets; empty the bucket on destroy.
resource "null_resource" "kb_bucket_empty_on_destroy" {
  triggers = {
    bucket = aws_s3_bucket.kb_data.id
  }

  depends_on = [
    aws_s3_bucket.kb_data,
    aws_s3_bucket_versioning.kb_data,
  ]

  provisioner "local-exec" {
    when = destroy
    environment = {
      KB_EMPTY_BUCKET = self.triggers.bucket
    }
    interpreter = ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command"]
    # Destroy provisioners may not reference local.*; path.module is allowed. No cmd.exe wrapper.
    command     = "& '${replace(replace(abspath("${path.module}/scripts/empty-versioned-s3-bucket.ps1"), "\\", "/"), "'", "''")}'"
  }
}

data "aws_caller_identity" "current" {}

resource "aws_cognito_user_pool" "users" {
  name = "${var.project_name}-users"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }
}

resource "aws_cognito_user_pool_client" "web_client" {
  name                                 = "${var.project_name}-web-client"
  user_pool_id                         = aws_cognito_user_pool.users.id
  generate_secret                      = false
  explicit_auth_flows                  = ["ALLOW_USER_PASSWORD_AUTH", "ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
  prevent_user_existence_errors        = "ENABLED"
  allowed_oauth_flows_user_pool_client = false
}

resource "aws_iam_role" "bedrock_kb_role" {
  name = "${var.project_name}-bedrock-kb-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "bedrock.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "bedrock_kb_policy" {
  name = "${var.project_name}-bedrock-kb-policy"
  role = aws_iam_role.bedrock_kb_role.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ],
        Resource = [
          aws_s3_bucket.kb_data.arn,
          "${aws_s3_bucket.kb_data.arn}/*"
        ]
      },
      {
        Effect = "Allow",
        Action = [
          "bedrock:InvokeModel"
        ],
        Resource = [var.bedrock_embedding_model_arn]
      },
      {
        Effect = "Allow",
        Action = [
          "aoss:APIAccessAll"
        ],
        Resource = ["*"]
      }
    ]
  })
}

resource "aws_opensearchserverless_security_policy" "kb_encryption" {
  name = "${var.project_name}-kb-encryption"
  type = "encryption"
  policy = jsonencode({
    Rules = [
      {
        Resource     = ["collection/${var.project_name}-kb"]
        ResourceType = "collection"
      }
    ]
    AWSOwnedKey = true
  })
}

resource "aws_opensearchserverless_security_policy" "kb_network" {
  name = "${var.project_name}-kb-network"
  type = "network"
  policy = jsonencode([
    {
      Rules = [
        {
          ResourceType = "collection"
          Resource     = ["collection/${var.project_name}-kb"]
        },
        {
          ResourceType = "dashboard"
          Resource     = ["collection/${var.project_name}-kb"]
        }
      ]
      AllowFromPublic = true
    }
  ])
}

resource "aws_opensearchserverless_access_policy" "kb_data" {
  name = "${var.project_name}-kb-data"
  type = "data"
  policy = jsonencode([
    {
      Rules = [
        {
          ResourceType = "collection"
          Resource     = ["collection/${var.project_name}-kb"]
          Permission = [
            "aoss:CreateCollectionItems",
            "aoss:DeleteCollectionItems",
            "aoss:UpdateCollectionItems",
            "aoss:DescribeCollectionItems"
          ]
        },
        {
          ResourceType = "index"
          Resource     = ["index/${var.project_name}-kb/*"]
          Permission = [
            "aoss:CreateIndex",
            "aoss:DeleteIndex",
            "aoss:UpdateIndex",
            "aoss:DescribeIndex",
            "aoss:ReadDocument",
            "aoss:WriteDocument"
          ]
        }
      ]
      Principal = distinct([
        aws_iam_role.bedrock_kb_role.arn,
        local.deployer_opensearch_principal,
      ])
    }
  ])
}

resource "aws_opensearchserverless_collection" "kb_vector" {
  name = "${var.project_name}-kb"
  type = "VECTORSEARCH"
  depends_on = [
    aws_opensearchserverless_security_policy.kb_encryption,
    aws_opensearchserverless_security_policy.kb_network,
    aws_opensearchserverless_access_policy.kb_data,
  ]
}

resource "null_resource" "kb_vector_index" {
  depends_on = [aws_opensearchserverless_collection.kb_vector]

  triggers = {
    collection_id        = aws_opensearchserverless_collection.kb_vector.id
    index_name           = local.kb_vector_index_name
    embedding_dimensions = var.bedrock_embedding_dimensions
    vector_field         = "bedrock-knowledge-base-vector"
  }

  provisioner "local-exec" {
    working_dir = abspath("${path.module}/..")
    command     = "node infra/scripts/create-aoss-kb-index.cjs"
    environment = {
      COLLECTION_ENDPOINT = aws_opensearchserverless_collection.kb_vector.collection_endpoint
      AWS_REGION          = var.aws_region
      INDEX_NAME          = local.kb_vector_index_name
      EMBEDDING_DIMENSION = tostring(var.bedrock_embedding_dimensions)
      VECTOR_FIELD        = "bedrock-knowledge-base-vector"
    }
  }
}

resource "aws_bedrockagent_knowledge_base" "astral_kb" {
  name     = "${var.project_name}-kb"
  role_arn = aws_iam_role.bedrock_kb_role.arn

  depends_on = [null_resource.kb_vector_index]

  knowledge_base_configuration {
    type = "VECTOR"

    vector_knowledge_base_configuration {
      embedding_model_arn = var.bedrock_embedding_model_arn
    }
  }

  storage_configuration {
    type = "OPENSEARCH_SERVERLESS"

    opensearch_serverless_configuration {
      collection_arn    = aws_opensearchserverless_collection.kb_vector.arn
      vector_index_name = local.kb_vector_index_name
      field_mapping {
        vector_field   = "bedrock-knowledge-base-vector"
        text_field     = "AMAZON_BEDROCK_TEXT_CHUNK"
        metadata_field = "AMAZON_BEDROCK_METADATA"
      }
    }
  }
}

resource "aws_bedrockagent_data_source" "astral_kb_s3" {
  knowledge_base_id = aws_bedrockagent_knowledge_base.astral_kb.id
  name              = "${var.project_name}-kb-datasource"

  data_source_configuration {
    type = "S3"
    s3_configuration {
      bucket_arn = aws_s3_bucket.kb_data.arn
    }
  }
}

resource "aws_bedrock_guardrail" "astral_guardrail" {
  name = "${var.project_name}-guardrail"

  blocked_input_messaging   = "Your prompt was blocked by AstralChat safety policy."
  blocked_outputs_messaging = "This response was blocked by AstralChat safety policy."

  content_policy_config {
    filters_config {
      type            = "HATE"
      input_strength  = "MEDIUM"
      output_strength = "MEDIUM"
    }
    filters_config {
      type            = "MISCONDUCT"
      input_strength  = "MEDIUM"
      output_strength = "MEDIUM"
    }
    filters_config {
      type            = "VIOLENCE"
      input_strength  = "LOW"
      output_strength = "LOW"
    }
  }
}

resource "aws_bedrock_guardrail_version" "astral_guardrail_v1" {
  guardrail_arn = aws_bedrock_guardrail.astral_guardrail.guardrail_arn
  description   = "Published version for use with RetrieveAndGenerate"
  skip_destroy  = false
}

resource "aws_dynamodb_table" "profiles" {
  name         = "${var.project_name}-profiles"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "battles" {
  name         = "${var.project_name}-battles"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "battleId"

  attribute {
    name = "battleId"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }
}

resource "aws_iam_role" "amplify_service_role" {
  count = var.enable_amplify_hosting ? 1 : 0
  name  = "${var.project_name}-amplify-service-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "amplify.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "amplify_bedrock_policy" {
  count = var.enable_amplify_hosting ? 1 : 0
  name  = "${var.project_name}-amplify-bedrock-policy"
  role  = aws_iam_role.amplify_service_role[0].id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "bedrock:Retrieve",
          "bedrock:RetrieveAndGenerate",
          "bedrock:InvokeModel",
          "bedrock:InvokeGuardrail"
        ],
        Resource = ["*"]
      },
      {
        Effect = "Allow",
        Action = [
          "aws-marketplace:ViewSubscriptions",
          "aws-marketplace:Subscribe"
        ],
        Resource = ["*"]
      },
      {
        Effect = "Allow",
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Scan"
        ],
        Resource = [
          aws_dynamodb_table.profiles.arn,
          aws_dynamodb_table.battles.arn
        ]
      }
    ]
  })
}

resource "aws_amplify_app" "app" {
  count = var.enable_amplify_hosting ? 1 : 0

  name                 = local.app_name
  repository           = var.github_repository_url
  access_token         = var.github_access_token
  platform             = "WEB_COMPUTE"
  iam_service_role_arn = aws_iam_role.amplify_service_role[0].arn

  environment_variables = {
    BEDROCK_REGION            = var.aws_region
    BEDROCK_KNOWLEDGE_BASE_ID = aws_bedrockagent_knowledge_base.astral_kb.id
    BEDROCK_MODEL_ARN         = var.bedrock_generation_model_arn
    BEDROCK_GUARDRAIL_ID      = aws_bedrock_guardrail.astral_guardrail.guardrail_id
    BEDROCK_GUARDRAIL_VERSION = "1"
    COGNITO_USER_POOL_ID      = aws_cognito_user_pool.users.id
    COGNITO_CLIENT_ID         = aws_cognito_user_pool_client.web_client.id
    BEDROCK_MAX_TOKENS        = "500"
    DYNAMODB_PROFILE_TABLE    = aws_dynamodb_table.profiles.name
    DYNAMODB_BATTLES_TABLE    = aws_dynamodb_table.battles.name
  }

  lifecycle {
    precondition {
      condition     = !var.enable_amplify_hosting || (var.github_repository_url != "" && var.github_access_token != "")
      error_message = "When enable_amplify_hosting is true, set github_repository_url and a valid github_access_token (HTTP 401 = bad or under-scoped PAT)."
    }
  }
}

resource "aws_amplify_branch" "main" {
  count = var.enable_amplify_hosting ? 1 : 0

  app_id            = aws_amplify_app.app[0].id
  branch_name       = "main"
  framework         = "Next.js - SSR"
  enable_auto_build = true
}
