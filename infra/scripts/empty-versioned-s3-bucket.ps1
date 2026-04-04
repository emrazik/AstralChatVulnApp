# Empties a versioned S3 bucket (all versions + delete markers) so DeleteBucket succeeds.
# Invoked by Terraform destroy. Requires AWS CLI v2 and credentials for the account.
param(
  [Parameter(Mandatory = $false)]
  [string]$Bucket = $null
)

if (-not $Bucket) {
  $Bucket = $env:KB_EMPTY_BUCKET
}
if (-not $Bucket) {
  throw "Bucket not set: pass -Bucket or set KB_EMPTY_BUCKET (Terraform destroy sets this)."
}

$ErrorActionPreference = "Stop"

function Send-DeleteObjects {
  param(
    [string]$BucketName,
    [hashtable[]]$ObjectVersions
  )
  if ($ObjectVersions.Count -eq 0) { return }
  $payload = @{ Objects = $ObjectVersions; Quiet = $true } | ConvertTo-Json -Compress -Depth 6
  $tmp = [System.IO.Path]::GetTempFileName() + ".json"
  try {
    [System.IO.File]::WriteAllText($tmp, $payload, [System.Text.UTF8Encoding]::new($false))
    $fileArg = "file://" + ($tmp -replace "\\", "/")
    & aws s3api delete-objects --bucket $BucketName --delete $fileArg
    if ($LASTEXITCODE -ne 0) { throw "delete-objects failed (exit $LASTEXITCODE)" }
  }
  finally {
    Remove-Item -Force -ErrorAction SilentlyContinue $tmp
  }
}

$keyMarker = $null
$versionMarker = $null

while ($true) {
  $awsArgs = @("s3api", "list-object-versions", "--bucket", $Bucket, "--output", "json")
  if ($keyMarker) {
    $awsArgs += @("--key-marker", $keyMarker)
    if ($versionMarker) { $awsArgs += @("--version-id-marker", $versionMarker) }
  }

  $raw = & aws @awsArgs
  if ($LASTEXITCODE -ne 0) { throw "list-object-versions failed (exit $LASTEXITCODE)" }
  $page = $raw | ConvertFrom-Json

  $batch = [System.Collections.Generic.List[hashtable]]::new()
  foreach ($prop in @("Versions", "DeleteMarkers")) {
    $items = $page.$prop
    if (-not $items) { continue }
    foreach ($it in $items) {
      $batch.Add(@{ Key = $it.Key; VersionId = $it.VersionId }) | Out-Null
      if ($batch.Count -ge 1000) {
        Send-DeleteObjects -BucketName $Bucket -ObjectVersions @($batch.ToArray())
        $batch.Clear()
      }
    }
  }
  if ($batch.Count -gt 0) {
    Send-DeleteObjects -BucketName $Bucket -ObjectVersions @($batch.ToArray())
  }

  if (-not $page.IsTruncated) { break }
  $keyMarker = $page.NextKeyMarker
  $versionMarker = $page.NextVersionIdMarker
}
