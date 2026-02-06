# Run Anchor test in Docker (starts local validator in container, deploys, runs test script).
# Usage: .\scripts\docker-test.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path $root)) { $root = (Get-Location).Path }

Set-Location $root
Write-Host "Running anchor test (official image, local validator + deploy)..."
docker compose run --rm --profile test anchor-test 2>&1
exit $LASTEXITCODE
