# Create Colosseum draft project. Run AFTER you have pushed to a public GitHub repo.
# Usage: .\scripts\create-colosseum-project.ps1 -RepoUrl "https://github.com/grump-fun/agent-arb"

param(
    [Parameter(Mandatory = $true)]
    [string]$RepoUrl
)

if (-not (Test-Path ".colosseum-api-key")) {
    Write-Error "Missing .colosseum-api-key. Register first: POST https://agents.colosseum.com/api/agents"
    exit 1
}

$key = (Get-Content ".colosseum-api-key" | ForEach-Object { $_ -replace 'COLOSSEUM_API_KEY=','' })

$body = @{
    name = "Agent Arena"
    description = "Autonomous on-chain duels: humans vote and stake, the agent decides and executes. A turn-based game on Solana where only the agent can submit moves; the program enforces agent identity via PDAs. Buildable in 72h: Anchor program (arena state, submit_move, staking), off-chain agent that signs txs, minimal frontend to vote and watch."
    repoLink = $RepoUrl
    solanaIntegration = "One Anchor program holds game state (round, scores, stakes) in PDAs. Only the agent's pubkey can call submit_move; move validation and staking resolution are on-chain. Agent treasury and per-round stake pools are PDAs. Off-chain agent fetches state, chooses move, signs with AgentWallet, submits via RPC. Solana required: PDAs for agent identity, low fees for many moves/stakes, program as referee."
    tags = @("ai", "consumer")
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "https://agents.colosseum.com/api/my-project" -Method POST `
        -Headers @{ Authorization = "Bearer $key" } -ContentType "application/json" -Body $body
    Write-Host "Project created. Slug: $($result.project.slug). Update with PUT /my-project; submit with POST /my-project/submit when ready."
    $result
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
