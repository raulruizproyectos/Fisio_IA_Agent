param(
  [string]$WorkspacePath = ""
)

$ErrorActionPreference = "Stop"

function Test-CloudSyncedPath {
  param([string]$Path)

  $normalized = [string]$Path
  if ([string]::IsNullOrWhiteSpace($normalized)) { return $false }
  return $normalized -match '(?i)([\\/]Mi unidad[\\/]|[\\/]Google Drive[\\/]|[\\/]OneDrive[\\/]|[\\/]Dropbox[\\/]|[\\/]iCloud Drive[\\/])'
}

function Test-AsciiOnlyPath {
  param([string]$Path)

  $normalized = [string]$Path
  if ([string]::IsNullOrWhiteSpace($normalized)) { return $true }
  return $normalized -cmatch '^[\x00-\x7F]+$'
}

if ([string]::IsNullOrWhiteSpace($WorkspacePath)) {
  $WorkspacePath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
} else {
  $WorkspacePath = (Resolve-Path $WorkspacePath).Path
}

if (-not (Test-Path (Join-Path $WorkspacePath '.git'))) {
  throw "La ruta no parece un repositorio Git: $WorkspacePath"
}

$repoRoot = git -C $WorkspacePath rev-parse --show-toplevel
$commonGitDir = git -C $WorkspacePath rev-parse --git-common-dir
$mode = if ($commonGitDir -like "$repoRoot*") { "standalone" } else { "worktree" }
$syncedWorkspace = Test-CloudSyncedPath $WorkspacePath
$syncedCommonDir = Test-CloudSyncedPath $commonGitDir
$asciiWorkspace = Test-AsciiOnlyPath $WorkspacePath

Write-Host "Workspace doctor" -ForegroundColor Cyan
Write-Host "Root: $repoRoot"
Write-Host "Git common dir: $commonGitDir"
Write-Host "Mode: $mode"
Write-Host "Ruta sincronizada: $syncedWorkspace"
Write-Host "Git common dir sincronizado: $syncedCommonDir"
Write-Host "Ruta ASCII pura: $asciiWorkspace"

if ($syncedWorkspace) {
  Write-Host "ERROR: estas trabajando dentro de una carpeta sincronizada. Mueve el workspace a C:\Temp o C:\dev." -ForegroundColor Red
  exit 2
}

if (-not $asciiWorkspace) {
  Write-Host "WARN: la ruta contiene caracteres no ASCII. No siempre rompe, pero reduce compatibilidad con tooling." -ForegroundColor Yellow
}

if ($mode -eq "worktree" -and $syncedCommonDir) {
  Write-Host "WARN: el worktree comparte .git con una ruta sincronizada. Esta bien para ahorrar disco, pero no es el modo de aislamiento maximo." -ForegroundColor Yellow
  Write-Host "Accion recomendada: powershell -ExecutionPolicy Bypass -File scripts/bootstrap-local-workspace.ps1 -Mode standalone -ForceRefresh" -ForegroundColor Yellow
  exit 1
}

Write-Host "OK: el workspace esta en una ruta valida para desarrollo local robusto." -ForegroundColor Green

