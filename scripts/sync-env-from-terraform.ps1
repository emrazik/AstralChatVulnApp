param(
  [string]$InfraDir = (Join-Path $PSScriptRoot "..\infra"),
  [string]$EnvFile = (Join-Path $PSScriptRoot "..\.env.local")
)

$ErrorActionPreference = "Stop"

$InfraDir = (Resolve-Path $InfraDir).Path
if (-not (Test-Path $EnvFile)) {
  $example = Join-Path (Split-Path $EnvFile -Parent) ".env.example"
  if (-not (Test-Path $example)) {
    throw ".env.local not found and no .env.example to copy from."
  }
  Copy-Item $example $EnvFile
  Write-Host "Created $EnvFile from .env.example"
}

Push-Location $InfraDir
try {
  $raw = terraform output -json 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "terraform output failed: $raw"
  }
} finally {
  Pop-Location
}

$out = $raw | ConvertFrom-Json

function Get-TfString($name) {
  $block = $out.$name
  if (-not $block) {
    throw "Terraform output missing: $name (run terraform apply in infra/)"
  }
  return [string]$block.value
}

$tfToEnv = [ordered]@{
  knowledge_base_id     = "BEDROCK_KNOWLEDGE_BASE_ID"
  guardrail_id          = "BEDROCK_GUARDRAIL_ID"
  guardrail_version     = "BEDROCK_GUARDRAIL_VERSION"
  cognito_user_pool_id  = "COGNITO_USER_POOL_ID"
  cognito_client_id     = "COGNITO_CLIENT_ID"
  profile_table_name    = "DYNAMODB_PROFILE_TABLE"
  battles_table_name    = "DYNAMODB_BATTLES_TABLE"
  messages_table_name   = "DYNAMODB_MESSAGES_TABLE"
}

$map = [ordered]@{}
foreach ($entry in $tfToEnv.GetEnumerator()) {
  $map[$entry.Value] = Get-TfString $entry.Key
}

$lines = Get-Content -LiteralPath $EnvFile
$seen = @{}

for ($i = 0; $i -lt $lines.Length; $i++) {
  $line = $lines[$i]
  if ($line -match '^\s*#' -or $line -notmatch '^([^=#\s][^=]*)=') {
    continue
  }
  $key = $matches[1].Trim()
  if ($map.Contains($key)) {
    $lines[$i] = "$key=$($map[$key])"
    $seen[$key] = $true
  }
}

foreach ($k in $map.Keys) {
  if (-not $seen[$k]) {
    $lines += "$k=$($map[$k])"
  }
}

Set-Content -LiteralPath $EnvFile -Value $lines -Encoding utf8
Write-Host "Updated Terraform-backed keys in $EnvFile"
