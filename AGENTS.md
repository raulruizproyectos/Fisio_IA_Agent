# Instrucciones Operativas de Sesion (Obligatorias)

## Regla de secretos (fuente unica)

- Todas las claves, tokens y accesos de APIs/plataformas se guardan en `.env.local`.
- `.env.local` es la fuente unica para buscar secretos en cada inicio de sesion.
- Nunca guardar secretos en archivos versionados del repo.

## Inicio de cada sesion

1. Cargar variables locales:
   - `powershell -ExecutionPolicy Bypass -File scripts/load-env-local.ps1`
2. Verificar claves requeridas:
   - `powershell -ExecutionPolicy Bypass -File scripts/check-secrets.ps1`
3. Si falta alguna clave:
   - Preguntar al usuario.
   - En cuanto la proporcione, anadirla a `.env.local` para futuras sesiones.

## Alta de nuevas credenciales

- Toda credencial nueva detectada durante la sesion debe anadirse a `.env.local`.
- Si una clave viene de Supabase Vault, sincronizarla con:
  - `node scripts/sync-openai-from-vault.mjs` (para `OPENAI_API_KEY`).

## Robustez obligatoria

- El sistema debe ser muy robusto y con control de errores.

## Entorno Windows local obligatorio

- No trabajar desde `G:\Mi unidad\...` cuando haya que editar, validar o instalar dependencias.
- Esa ruta sincronizada provoca bloqueos de sandbox, I/O y npm en este proyecto.
- Antes de una sesion de desarrollo, preparar workspace local completo con:
  - `powershell -ExecutionPolicy Bypass -File scripts/bootstrap-local-workspace.ps1`
- A partir de ahi, abrir y continuar la sesion desde `C:\Temp\Fisio_IA_Agent_workspace`.
- `C:\Temp` es solo workspace de desarrollo y validacion.
- La operacion real del sistema debe quedar en VPS/EasyPanel/Hostinger/n8n/Supabase, sin depender de que el ordenador local este encendido.
- El bootstrap crea un `git worktree` local, no un clon completo duplicado.
- Si el repo origen tiene cambios sin commit, el script avisa para no ocultarlos.
- Si el sandbox sigue heredando estado de `G:\Mi unidad\...`, usar aislamiento maximo:
  - `powershell -ExecutionPolicy Bypass -File scripts/bootstrap-local-workspace.ps1 -Mode standalone -ForceRefresh`
- Verificacion rapida del workspace:
  - `powershell -ExecutionPolicy Bypass -File scripts/doctor-windows-workspace.ps1`
- Referencia operativa:
  - `docs/windows_sandbox_strategy_20260310.md`
