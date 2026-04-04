output "knowledge_base_id" {
  value = aws_bedrockagent_knowledge_base.astral_kb.id
}

output "kb_data_source_id" {
  value       = aws_bedrockagent_data_source.astral_kb_s3.data_source_id
  description = "S3 data source ID for StartIngestionJob (no bedrock:ListDataSources IAM needed)"
}

output "guardrail_id" {
  value = aws_bedrock_guardrail.astral_guardrail.guardrail_id
}

output "guardrail_version" {
  value       = aws_bedrock_guardrail_version.astral_guardrail_v1.version
  description = "Published guardrail version number"
}

output "kb_bucket_name" {
  value = aws_s3_bucket.kb_data.id
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.users.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.web_client.id
}

output "profile_table_name" {
  value       = aws_dynamodb_table.profiles.name
  description = "DynamoDB table for user profiles"
}

output "battles_table_name" {
  value       = aws_dynamodb_table.battles.name
  description = "DynamoDB table for battle state"
}

output "amplify_app_id" {
  value       = try(aws_amplify_app.app[0].id, null)
  description = "Set when enable_amplify_hosting is true"
}
