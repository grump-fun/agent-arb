# Validate render.yaml (syntax + required Blueprint fields) using Docker.
# Usage: .\scripts\validate-render-blueprint.ps1
# Optional: set RENDER_API_KEY to also validate via Render API.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path $root)) { $root = (Get-Location).Path }
$renderYaml = Join-Path $root "render.yaml"
if (-not (Test-Path $renderYaml)) { Write-Error "render.yaml not found"; exit 1 }

Write-Host "Validating render.yaml (Docker Python + PyYAML)..."
docker run --rm -v "${root}:/work" -w /work python:3-alpine sh -c "pip install -q pyyaml && python /work/scripts/validate_render_blueprint.py"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Done."
exit 0
