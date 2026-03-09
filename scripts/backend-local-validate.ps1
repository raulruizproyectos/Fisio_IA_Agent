param(
  [string]$RepoRoot = "",
  [string]$WorkDir = "C:\Temp\Fisio_IA_Agent_backend_local"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
}

$sourceBackend = Join-Path $RepoRoot "backend"
if (-not (Test-Path $sourceBackend)) {
  throw "No existe backend en: $sourceBackend"
}

Write-Host "Preparando copia local no sincronizada..." -ForegroundColor Cyan
if (Test-Path $WorkDir) {
  Remove-Item -Recurse -Force $WorkDir
}
New-Item -ItemType Directory -Path $WorkDir | Out-Null

$null = robocopy $sourceBackend $WorkDir /E /XD node_modules dist .cache
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

  Write-Host "Ejecutando lint..." -ForegroundColor Cyan
  npm run lint
  if ($LASTEXITCODE -ne 0) {
    throw "npm run lint fallo con codigo $LASTEXITCODE"
  }

  Write-Host "Comprobando sintaxis Node..." -ForegroundColor Cyan
  $checks = @(
    'src/index.js',
    'src/routes/agent.js',
    'src/routes/exercises.js',
    'src/routes/telegram.js',
    'src/routes/professional.js',
    'src/routes/patients.js'
  )

  foreach ($file in $checks) {
    node --check $file
    if ($LASTEXITCODE -ne 0) {
      throw "node --check fallo en $file con codigo $LASTEXITCODE"
    }
  }
}
finally {
  Pop-Location
}

Write-Host "OK: backend validado en $WorkDir" -ForegroundColor Green
