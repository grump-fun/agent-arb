# Build Agent Arena Anchor program in Docker (Windows).
# Solana/Anchor run inside the container; no local install needed.
# Usage: .\scripts\docker-build.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path $root)) { $root = (Get-Location).Path }

Set-Location $root
Write-Host "Running anchor build (official image solanafoundation/anchor:v0.31.1)..."
docker compose run --rm anchor-build 2>&1
exit $LASTEXITCODE
