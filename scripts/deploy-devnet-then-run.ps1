# Deploy program to devnet, init arena, run agent once.
# Requires: .solana-id.json and .agent-keypair.json funded (see DEPLOY_STATUS.md).
# Usage: .\scripts\deploy-devnet-then-run.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$composePath = Join-Path $root "docker-compose.yml"
$keypairPath = if ($env:SOLANA_KEYPAIR_PATH) { $env:SOLANA_KEYPAIR_PATH } else { Join-Path $root ".solana-id.json" }
if (-not (Test-Path $keypairPath)) {
    Write-Host "Create and fund .solana-id.json (see DEPLOY_STATUS.md)."
    exit 1
}

# 1. Build if needed
if (-not (Test-Path (Join-Path $root "target\deploy\agent_arena.so"))) {
    Write-Host "Building program..."
    & (Join-Path $root "scripts\docker-build.ps1")
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

# 2. Deploy
Write-Host "Deploying program to devnet..."
$keypairAbs = (Resolve-Path $keypairPath).Path.Replace("\", "/")
$deployOut = docker compose -f $composePath run --rm -v "${keypairAbs}:/root/.config/solana/id.json:ro" anchor-build anchor deploy --provider.cluster devnet 2>&1
$deployOut | ForEach-Object { Write-Host $_ }
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 3. Get program ID (from program keypair)
$programIdLines = docker compose -f $composePath run --rm anchor-build solana-keygen pubkey /workdir/target/deploy/agent_arena-keypair.json 2>&1
$programId = ($programIdLines | ForEach-Object { $_.Trim() } | Where-Object { $_.Length -ge 32 -and $_.Length -le 44 } | Select-Object -Last 1)
if (-not $programId) { Write-Host "Could not get program ID"; exit 1 }
Write-Host "Program ID: $programId"

# 4. Init arena
Write-Host "Initializing arena..."
$env:AGENT_ARENA_PROGRAM_ID = $programId
node (Join-Path $root "agent\init-arena.js")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 5. Run agent once
Write-Host "Running agent once..."
$env:AGENT_ARENA_PROGRAM_ID = $programId
$env:SOLANA_RPC_URL = "https://api.devnet.solana.com"
node (Join-Path $root "agent\run.js")
Write-Host "Done. Set AGENT_ARENA_PROGRAM_ID=$programId and SOLANA_RPC_URL for app/agent."
exit 0
