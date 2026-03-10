param(
  [string]$SourceRepo = "",
  [string]$TargetPath = "C:\Temp\Fisio_IA_Agent_workspace",
  [ValidateSet("worktree", "standalone")]
  [string]$Mode = "worktree",
  [switch]$ForceRefresh,
  [switch]$AllowDirtySource
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

function Write-WorkspaceMetadata {
  param(
    [string]$WorkspacePath,
    [string]$WorkspaceMode,
    [string]$WorkspaceSource
  )

  $commonGitDir = git -C $WorkspacePath rev-parse --git-common-dir
  $metadata = [ordered]@{
    created_at_utc = (Get-Date).ToUniversalTime().ToString("o")
    mode = $WorkspaceMode
    source_repo = $WorkspaceSource
    workspace_path = $WorkspacePath
    git_common_dir = $commonGitDir
  } | ConvertTo-Json -Depth 3

  Set-Content -Path (Join-Path $WorkspacePath '.workspace-context.json') -Value $metadata -Encoding UTF8
}

if ([string]::IsNullOrWhiteSpace($SourceRepo)) {
  $SourceRepo = Resolve-Path (Join-Path $PSScriptRoot "..")
}

$SourceRepo = (Resolve-Path $SourceRepo).Path
$gitDir = Join-Path $SourceRepo '.git'
if (-not (Test-Path $gitDir)) {
  throw "No existe .git en la ruta origen: $SourceRepo"
}

if (Test-CloudSyncedPath $SourceRepo) {
  Write-Host "Aviso: el repo origen esta dentro de una carpeta sincronizada. No edites ni valides desde ahi." -ForegroundColor Yellow
}

if (Test-CloudSyncedPath $TargetPath) {
  throw "La ruta destino no puede estar dentro de una carpeta sincronizada: $TargetPath"
}

if (-not (Test-AsciiOnlyPath $TargetPath)) {
  Write-Host "Aviso: la ruta destino contiene caracteres no ASCII. Para maxima compatibilidad usa una ruta corta y ASCII puro." -ForegroundColor Yellow
}

$sourceStatus = git -C $SourceRepo status --porcelain
if ($sourceStatus -and -not $AllowDirtySource) {
  throw "El repo origen tiene cambios sin commit. Haz commit/stash o relanza con -AllowDirtySource si quieres preparar igualmente el worktree local."
}

if (Test-Path $TargetPath) {
  if (-not $ForceRefresh) {
    Write-Host "El workspace local ya existe en: $TargetPath" -ForegroundColor Yellow
    Write-Host "Usa -ForceRefresh si quieres regenerarlo desde la ruta sincronizada." -ForegroundColor Yellow
    return
  }

  Write-Host "Eliminando workspace local anterior..." -ForegroundColor Yellow
  if ($Mode -eq "worktree") {
    git -C $SourceRepo worktree remove --force $TargetPath 2>$null
  }
  if (Test-Path $TargetPath) {
    Remove-Item -Recurse -Force $TargetPath
  }
}

if ($Mode -eq "worktree") {
  git -C $SourceRepo worktree prune

  Write-Host "Creando git worktree local en ruta no sincronizada..." -ForegroundColor Cyan
  git -C $SourceRepo worktree add --detach $TargetPath HEAD
  if ($LASTEXITCODE -ne 0) {
    throw "git worktree add fallo con codigo $LASTEXITCODE"
  }
} else {
  Write-Host "Creando clone local independiente para aislamiento maximo..." -ForegroundColor Cyan
  git clone --no-local $SourceRepo $TargetPath
  if ($LASTEXITCODE -ne 0) {
    throw "git clone --no-local fallo con codigo $LASTEXITCODE"
  }

  $originUrl = git -C $SourceRepo remote get-url origin 2>$null
  if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($originUrl)) {
    git -C $TargetPath remote set-url origin $originUrl
  }
}

git -C $TargetPath config core.longpaths true
git -C $TargetPath config core.filemode false
Write-WorkspaceMetadata -WorkspacePath $TargetPath -WorkspaceMode $Mode -WorkspaceSource $SourceRepo

Write-Host "Workspace local listo." -ForegroundColor Green
Write-Host "Ruta: $TargetPath" -ForegroundColor Green
Write-Host "Modo: $Mode" -ForegroundColor Green
Write-Host "Siguiente paso recomendado:" -ForegroundColor Cyan
Write-Host "1. Abre esta carpeta en Codex/VS Code." -ForegroundColor Cyan
Write-Host "2. Continua trabajando desde ahi, no desde G:\Mi unidad\..." -ForegroundColor Cyan
Write-Host "3. Ejecuta scripts/doctor-windows-workspace.ps1 para verificar si estas en modo ligero o aislado." -ForegroundColor Cyan
Write-Host "4. Ejecuta scripts/load-env-local.ps1 y scripts/check-secrets.ps1 dentro del workspace local." -ForegroundColor Cyan
Write-Host "5. Recuerda: C:\Temp es solo desarrollo; la operacion real debe seguir en VPS/EasyPanel/n8n/Supabase." -ForegroundColor Cyan
if ($Mode -eq "worktree") {
  Write-Host "Nota: worktree ahorra disco, pero comparte .git con la ruta origen. Si el sandbox vuelve a tocar G:, relanza con -Mode standalone." -ForegroundColor Yellow
} else {
  Write-Host "Nota: standalone ocupa mas disco, pero deja de depender de la carpeta sincronizada y es la opcion mas robusta para Codex/herramientas." -ForegroundColor Yellow
}

if ($sourceStatus) {
  Write-Host "Aviso: el repo origen estaba dirty y este workspace nace desde HEAD, no desde los cambios sin commit." -ForegroundColor Yellow
}

