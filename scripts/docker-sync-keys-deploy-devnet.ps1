# Sync Anchor program keys (so program ID matches target/deploy/agent_arena-keypair.json),
# then build and deploy to devnet. Use this when keys are out of sync or you haven't deployed yet.
# Requires: Docker, deploy wallet at .\.solana-id.json (or SOLANA_KEYPAIR_PATH) funded on devnet.
# Usage: .\scripts\docker-sync-keys-deploy-devnet.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path $root)) { $root = (Get-Location).Path }

$keypairPath = if ($env:SOLANA_KEYPAIR_PATH) { $env:SOLANA_KEYPAIR_PATH } else { Join-Path $root ".solana-id.json" }
if (-not (Test-Path $keypairPath)) {
    Write-Host "Deploy wallet not found. Create and fund .solana-id.json (see DEPLOY_STATUS.md), or set SOLANA_KEYPAIR_PATH."
    exit 1
}

Set-Location $root
$composePath = Join-Path $root "docker-compose.yml"
$keypairAbs = (Resolve-Path $keypairPath).Path.Replace("\", "/")

Write-Host "Step 1: Ensure program keypair exists in target/deploy/..."
$keypairDeployPath = Join-Path $root "target\deploy\agent_arena-keypair.json"
if (-not (Test-Path $keypairDeployPath)) {
    Write-Host "  Creating target/deploy/agent_arena-keypair.json via Docker..."
    docker compose -f $composePath run --rm anchor-build sh -c "solana-keygen new -o target/deploy/agent_arena-keypair.json --force --no-bip39-passphrase" 2>&1
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
    Write-Host "  Program keypair already exists."
}
docker compose -f $composePath run --rm anchor-build anchor keys list 2>&1
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Step 2: Sync program keys to Anchor.toml and lib.rs for devnet..."
docker compose -f $composePath run --rm anchor-build anchor keys sync --provider.cluster devnet 2>&1
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Step 3: Build program..."
docker compose -f $composePath run --rm anchor-build 2>&1
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Step 4: Deploy to devnet (payer: .solana-id.json)..."
# Mount deploy keypair so Anchor sees it as .solana-id.json in workdir (Anchor.toml wallet)
docker compose -f $composePath run --rm -v "${keypairAbs}:/workdir/.solana-id.json:ro" anchor-build anchor deploy --provider.cluster devnet 2>&1
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Done. Program ID is in Anchor.toml [programs.devnet] and target/deploy/agent_arena-keypair.json. Update app with this program ID if needed."
exit 0
