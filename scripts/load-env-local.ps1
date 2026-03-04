param(
  [string]$EnvFile = '.env.local'
)

if (!(Test-Path $EnvFile)) {
  Write-Error "No existe $EnvFile"
  exit 1
}

Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^[A-Za-z_][A-Za-z0-9_]*=') {
    $i = $_.IndexOf('=')
    $k = $_.Substring(0, $i)
    $v = $_.Substring($i + 1)
    Set-Item -Path "Env:$k" -Value $v
  }
}

Write-Output "Variables cargadas desde $EnvFile"
