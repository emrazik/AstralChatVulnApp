param(
  [Parameter(Mandatory = $false)]
  [string]$BucketName,
  [Parameter(Mandatory = $false)]
  [string]$Region = "us-east-1",
  [Parameter(Mandatory = $false)]
  [string]$KnowledgeBaseId,
  [Parameter(Mandatory = $false)]
  [string]$DataSourceId,
  [Parameter(Mandatory = $false)]
  [string]$InfraDir = (Join-Path $PSScriptRoot "..")
)

$ErrorActionPreference = "Stop"

$infraResolved = (Resolve-Path -LiteralPath $InfraDir).Path

function Read-TerraformRawOutput([string]$Name) {
  Push-Location $infraResolved
  try {
    $out = terraform output -raw $Name 2>&1
    if ($LASTEXITCODE -ne 0) {
      throw "terraform output -raw $Name failed (exit $LASTEXITCODE): $out"
    }
    return [string]$out.Trim()
  }
  finally {
    Pop-Location
  }
}

if (-not $BucketName) {
  $BucketName = Read-TerraformRawOutput "kb_bucket_name"
}
if (-not $KnowledgeBaseId) {
  $KnowledgeBaseId = Read-TerraformRawOutput "knowledge_base_id"
}
if (-not $DataSourceId) {
  $DataSourceId = Read-TerraformRawOutput "kb_data_source_id"
}

Write-Host "Using bucket=$BucketName knowledgeBaseId=$KnowledgeBaseId dataSourceId=$DataSourceId region=$Region (infra: $infraResolved)"

$contentPath = Join-Path $PSScriptRoot "..\..\content\"
Write-Host "Uploading knowledge base content from $contentPath to s3://$BucketName/content/..."
aws s3 cp $contentPath "s3://$BucketName/content/" --recursive --region $Region

Write-Host "Starting Bedrock KB ingestion job..."
aws bedrock-agent start-ingestion-job `
  --knowledge-base-id $KnowledgeBaseId `
  --data-source-id $DataSourceId `
  --region $Region

Write-Host "Upload and sync command submitted."
