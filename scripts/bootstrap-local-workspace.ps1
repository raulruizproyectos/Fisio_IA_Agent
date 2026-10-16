param(
  [string]$SourceRepo = "",
  [string]$TargetPath = "C:\Temp\Fisio_IA_Agent_workspace",
  [switch]$ForceRefresh
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($SourceRepo)) {
  $SourceRepo = Resolve-Path (Join-Path $PSScriptRoot "..")
}

$SourceRepo = (Resolve-Path $SourceRepo).Path
$gitDir = Join-Path $SourceRepo '.git'
if (-not (Test-Path $gitDir)) {
  throw "No existe .git en la ruta origen: $SourceRepo"
}

if (Test-Path $TargetPath) {
  if (-not $ForceRefresh) {
    Write-Host "El workspace local ya existe en: $TargetPath" -ForegroundColor Yellow
    Write-Host "Elige otro -TargetPath para preparar una copia nueva." -ForegroundColor Yellow
    return
  }

  throw 'El destino ya existe. Elige otro -TargetPath; -ForceRefresh no borra trabajo anterior.'
}

. (Join-Path $PSScriptRoot 'new-local-workspace.ps1')
$TargetPath = New-LocalWorkspace -SourcePath $SourceRepo -TargetPath $TargetPath

Write-Host "Copiando repo a ruta local no sincronizada..." -ForegroundColor Cyan
$null = robocopy $SourceRepo $TargetPath /MIR /XD node_modules .astro dist .next .turbo .cache .output .vercel /XF *.log
$robocopyExit = $LASTEXITCODE
if ($robocopyExit -gt 7) {
  throw "Robocopy fallo con codigo $robocopyExit"
}

Write-Host "Workspace local listo." -ForegroundColor Green
Write-Host "Ruta: $TargetPath" -ForegroundColor Green
Write-Host "Siguiente paso recomendado:" -ForegroundColor Cyan
Write-Host "1. Abre esta carpeta en Codex/VS Code." -ForegroundColor Cyan
Write-Host "2. Continua trabajando desde ahi, no desde G:\Mi unidad\..." -ForegroundColor Cyan
Write-Host "3. Ejecuta scripts/load-env-local.ps1 y scripts/check-secrets.ps1 dentro del workspace local." -ForegroundColor Cyan
