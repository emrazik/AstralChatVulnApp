param(
  [switch]$AutoApprove
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..\infra")

terraform init
if ($AutoApprove) {
  terraform destroy -auto-approve
} else {
  terraform destroy
}
