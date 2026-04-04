param(
  [switch]$AutoApprove
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..\infra")

terraform init
$applyOk = $false
if ($AutoApprove) {
  terraform apply -auto-approve
  $applyOk = ($LASTEXITCODE -eq 0)
} else {
  terraform apply
  $applyOk = ($LASTEXITCODE -eq 0)
}

if ($applyOk) {
  & (Join-Path $PSScriptRoot "sync-env-from-terraform.ps1")
}
