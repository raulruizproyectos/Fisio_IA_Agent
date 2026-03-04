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
