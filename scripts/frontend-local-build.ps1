param(
  [string]$RepoRoot = "",
  [string]$WorkDir = "C:\Temp\Fisio_IA_Agent_frontend_local"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
}

$sourceFrontend = Join-Path $RepoRoot "frontend"
if (-not (Test-Path $sourceFrontend)) {
  throw "No existe frontend en: $sourceFrontend"
}

Write-Host "Preparando copia local no sincronizada..." -ForegroundColor Cyan
if (Test-Path $WorkDir) {
  Remove-Item -Recurse -Force $WorkDir
}
New-Item -ItemType Directory -Path $WorkDir | Out-Null

$null = robocopy $sourceFrontend $WorkDir /E /XD node_modules node_modules_stuck* dist .astro
$robocopyExit = $LASTEXITCODE
if ($robocopyExit -gt 7) {
  throw "Robocopy fallo con codigo $robocopyExit"
}

Push-Location $WorkDir
try {
  Write-Host "Instalando dependencias..." -ForegroundColor Cyan
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) {
    throw "npm install fallo con codigo $LASTEXITCODE"
  }

  Write-Host "Ejecutando build..." -ForegroundColor Cyan
  npm run build
  if ($LASTEXITCODE -ne 0) {
    throw "npm run build fallo con codigo $LASTEXITCODE"
  }
}
finally {
  Pop-Location
}

Write-Host "OK: frontend validado en $WorkDir" -ForegroundColor Green
