# Estrategia Windows Sandbox 2026-03-10

## Problema real
- La ruta sincronizada `G:\Mi unidad\...` mezcla:
  - carpeta cloud sync,
  - espacios,
  - caracteres no ASCII,
  - y herramientas Node/Git/Codex que necesitan I/O estable.
- Eso provoca fallos intermitentes de sandbox, locks de ficheros y validaciones poco fiables.

## Como lo resuelven los equipos mas fuertes
- No desarrollan sobre carpetas sincronizadas en vivo.
- Mantienen el codigo en el mismo filesystem que usa el tooling.
- Separan:
  - desarrollo,
  - runtime,
  - backup/sync.
- Cuando quieren ahorrar disco usan `git worktree`.
- Cuando necesitan aislamiento maximo usan un clone local independiente, Dev Container o Remote SSH.

## Fuentes de referencia
- Git worktree oficial:
  - https://git-scm.com/docs/git-worktree
- Microsoft WSL / filesystem guidance:
  - https://learn.microsoft.com/windows/wsl/filesystems
- VS Code Dev Containers / clone en volumen para mejorar rendimiento:
  - https://code.visualstudio.com/remote/advancedcontainers/improve-performance

## Politica operativa para este proyecto
- Runtime real:
  - VPS + EasyPanel + Hostinger + n8n + Supabase.
- Desarrollo local Windows:
  - nunca desde `G:\Mi unidad\...`.
- Opcion por defecto:
  - `worktree` en `C:\Temp\Fisio_IA_Agent_workspace`
  - ventaja: no duplica el repo entero.
  - coste: comparte `.git` con el repo origen.
- Opcion definitiva si el sandbox o el tooling siguen tocando `G:`:
  - `standalone`
  - ventaja: aislamiento maximo, sin depender de la carpeta sincronizada.
  - coste: ocupa mas disco que `worktree`.

## Comandos recomendados
- Modo ligero:
  - `powershell -ExecutionPolicy Bypass -File scripts/bootstrap-local-workspace.ps1`
- Modo aislamiento maximo:
  - `powershell -ExecutionPolicy Bypass -File scripts/bootstrap-local-workspace.ps1 -Mode standalone -ForceRefresh`
- Diagnostico:
  - `powershell -ExecutionPolicy Bypass -File scripts/doctor-windows-workspace.ps1`

## Decision practica
- Si la sesion abre ya en `C:\Temp` y todo valida: usar `worktree`.
- Si Codex sigue heredando el contexto de `G:` o reaparecen errores de sandbox/setup: pasar a `standalone`.
- Si queremos aislamiento todavia mayor en el futuro:
  - Remote SSH al VPS o staging,
  - o Dev Container/WSL con el repo fuera de carpetas sincronizadas.
