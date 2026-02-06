# Run Anchor test in Docker (starts local validator in container, deploys, runs test script).
# Usage: .\scripts\docker-test.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path $root)) { $root = (Get-Location).Path }

Set-Location $root
docker compose build anchor-build 2>&1
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Running anchor test (local validator + deploy + test script)..."
docker compose run --rm --profile test anchor-test 2>&1
exit $LASTEXITCODE
