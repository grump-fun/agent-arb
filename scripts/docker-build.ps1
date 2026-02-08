# Build Agent Arena Anchor program in Docker (Windows).
# Solana/Anchor run inside the container; no local install needed.
# Usage: .\scripts\docker-build.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path $root)) { $root = (Get-Location).Path }

Set-Location $root
$composePath = Join-Path $root "docker-compose.yml"
if (-not (Test-Path $composePath)) { Write-Error "docker-compose.yml not found at $root"; exit 1 }
Write-Host "Running anchor build (official image solanafoundation/anchor:v0.32.1)..."
docker compose -f $composePath run --rm anchor-build 2>&1
exit $LASTEXITCODE
