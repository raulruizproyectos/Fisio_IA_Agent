$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'new-local-workspace.ps1')

$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('fisio-workspace-test-' + [guid]::NewGuid())
$source = Join-Path $testRoot 'source'
New-Item -ItemType Directory -Path $source | Out-Null
$marker = Join-Path $source 'keep.txt'
Set-Content -LiteralPath $marker -Value 'preserved'

$existing = Join-Path $testRoot 'existing'
New-Item -ItemType Directory -Path $existing | Out-Null
$rejectedPaths = @($source, $testRoot, (Join-Path $source 'child'), 'C:\', 'C:\Temp',
  'relative-path', (Join-Path ([IO.Path]::GetPathRoot($source)) 'outside-temp'), $existing)
foreach ($target in $rejectedPaths) {
  $rejected = $false
  try { New-LocalWorkspace -SourcePath $source -TargetPath $target | Out-Null }
  catch { $rejected = $true }
  if (-not $rejected) { throw "Destino inseguro aceptado: $target" }
}

$fresh = New-LocalWorkspace -SourcePath $source -TargetPath (Join-Path $testRoot 'fresh')
if (-not (Test-Path -LiteralPath $fresh -PathType Container)) { throw 'No se creó el destino nuevo.' }
if ((Get-Content -LiteralPath $marker) -ne 'preserved') { throw 'Se modificó el origen.' }
foreach ($script in @('backend-local-validate.ps1', 'frontend-local-build.ps1', 'bootstrap-local-workspace.ps1')) {
  $content = Get-Content -LiteralPath (Join-Path $PSScriptRoot $script) -Raw
  if ($content -match 'Remove-Item' -or $content -notmatch 'New-LocalWorkspace') {
    throw "El script no usa la preparación segura: $script"
  }
}
Write-Output 'PASS: destinos inseguros/existentes rechazados, destino nuevo creado y origen conservado; ningún helper borra directorios.'
