# Security Policy

## Reporte de vulnerabilidades
No publicar vulnerabilidades en issues publicos.

Canal recomendado:
- Crear un mensaje privado al mantenedor del repositorio con:
  - Descripcion del hallazgo
  - Impacto
  - Pasos de reproduccion
  - Evidencia

## Buenas practicas obligatorias
- Rotar inmediatamente credenciales expuestas en chats o logs.
- Nunca commitear `.env` ni secretos en texto plano.
- Revisar PRs buscando tokens, passwords y URLs sensibles.

## Alcance critico
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- Tokens API de n8n y EasyPanel
- Cookies de sesion
