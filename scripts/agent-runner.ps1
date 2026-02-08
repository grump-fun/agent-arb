# Run the autonomous agent runner (Cursor CLI + context every 30 min).
# Usage: .\scripts\agent-runner.ps1
# Env: INTERVAL_MIN (default 30), CURSOR_API_KEY, X_POST_WEBHOOK_URL (optional)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
node scripts/agent-runner.js
exit $LASTEXITCODE
