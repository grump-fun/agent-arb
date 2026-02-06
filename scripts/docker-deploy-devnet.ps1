# Deploy the built program to devnet from inside Docker (Windows).
# Requires: (1) Program already built (.\scripts\docker-build.ps1),
#           (2) Keypair for deploy wallet at .\.solana-id.json (or set SOLANA_KEYPAIR_PATH).
# Fund the keypair on devnet first (e.g. node agent/faucet.js with AgentWallet, or airdrop to the pubkey).
# Usage: .\scripts\docker-deploy-devnet.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path $root)) { $root = (Get-Location).Path }

$keypairPath = if ($env:SOLANA_KEYPAIR_PATH) { $env:SOLANA_KEYPAIR_PATH } else { Join-Path $root ".solana-id.json" }
if (-not (Test-Path $keypairPath)) {
    Write-Host "Create a keypair, fund it on devnet, then save as .solana-id.json or set SOLANA_KEYPAIR_PATH."
    exit 1
}

Set-Location $root
# Docker Desktop on Windows: use the keypair path as mount source (e.g. C:\Users\...\agent-arb\.solana-id.json)
$keypairAbs = (Resolve-Path $keypairPath).Path.Replace("\", "/")
docker compose run --rm -v "${keypairAbs}:/root/.config/solana/id.json:ro" anchor-build anchor deploy --provider.cluster devnet
exit $LASTEXITCODE
