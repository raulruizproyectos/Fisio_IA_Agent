param(
  [string]$EnvFile = '.env.local'
)

if (!(Test-Path $EnvFile)) {
  Write-Error "No existe $EnvFile"
  exit 1
}

$required = @(
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_PROJECT_REF',
  'SUPABASE_MANAGEMENT_PAT',
  'N8N_BASE_URL',
  'N8N_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_BOT_USERNAME',
  'FISIO_BACKEND_URL',
  'FISIO_FRONTEND_URL',
  'OPENAI_API_KEY'
)

$envMap = @{}
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^[A-Za-z_][A-Za-z0-9_]*=') {
    $i = $_.IndexOf('=')
    $k = $_.Substring(0, $i).Trim()
    $v = $_.Substring($i + 1)
    $envMap[$k] = $v
  }
}

$missing = @()
foreach ($key in $required) {
  if (-not $envMap.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($envMap[$key])) {
    $missing += $key
  }
}

if ($missing.Count -gt 0) {
  Write-Output "MISSING: $($missing -join ', ')"
  exit 2
}

Write-Output 'OK: claves requeridas presentes en .env.local'
