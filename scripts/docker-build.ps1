# Build Agent Arena Anchor program in Docker (Windows).
# Solana/Anchor run inside the container; no local install needed.
# Usage: .\scripts\docker-build.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path $root)) { $root = (Get-Location).Path }

Set-Location $root
Write-Host "Building Docker image (first time may take several minutes)..."
docker compose build anchor-build 2>&1
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Running anchor build in container..."
docker compose run --rm anchor-build 2>&1
exit $LASTEXITCODE
