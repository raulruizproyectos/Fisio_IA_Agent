function New-LocalWorkspace {
  param([string]$SourcePath, [string]$TargetPath)

  $source = (Resolve-Path -LiteralPath $SourcePath -ErrorAction Stop).Path.TrimEnd('\', '/')
  if (-not [IO.Path]::IsPathRooted($TargetPath)) {
    throw 'El destino debe ser una ruta absoluta nueva dentro de C:\Temp o TEMP.'
  }
  $target = [IO.Path]::GetFullPath($TargetPath).TrimEnd('\', '/')
  $temporaryRoots = @('C:\Temp', [IO.Path]::GetTempPath())
  $insideTemp = @($temporaryRoots | Where-Object {
    $target.StartsWith([IO.Path]::GetFullPath($_).TrimEnd('\', '/') + '\', [StringComparison]::OrdinalIgnoreCase)
  }).Count -gt 0
  if (-not $insideTemp -or $target.Equals($source, [StringComparison]::OrdinalIgnoreCase) -or
      $target.StartsWith($source + '\', [StringComparison]::OrdinalIgnoreCase) -or
      $source.StartsWith($target + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'El destino debe estar dentro de C:\Temp o TEMP y fuera del origen y sus ancestros.'
  }
  $ancestor = $target
  while ($ancestor) {
    if (Test-Path -LiteralPath $ancestor) {
      $item = Get-Item -LiteralPath $ancestor -Force -ErrorAction Stop
      if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        throw 'El destino no puede atravesar enlaces o uniones de directorios.'
      }
    }
    $ancestor = [IO.Path]::GetDirectoryName($ancestor)
  }
  if (Test-Path -LiteralPath $target) {
    throw 'El destino ya existe; elige una carpeta nueva. No se borra ni reemplaza trabajo anterior.'
  }
  New-Item -ItemType Directory -Path $target -ErrorAction Stop | Out-Null
  return $target
}
