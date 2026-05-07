# Fisio_IA_Agent

CRM y agentes para un centro de fisioterapia: pacientes, agenda, finanzas, documentos y agente IA de ejercicios, con backend propio, Supabase, n8n, Telegram y Google Calendar.

## Estado actual
- Rama: `main`.
- Ultimo cierre remoto: `53f4a2d` - `fix: make assistant rail chat-first with useful empty state`.
- Commit previo relevante: `c519b13` - `fix: compact assistant rail and prioritize chat workspace`.
- Frontend productivo: `fisio-frontend` en EasyPanel.
- Backend productivo: `fisio-backend` en EasyPanel.
- Checkpoint vivo: `docs/SESSION_CURRENT.md`.
- Checklist vivo: `configuracion_pendiente.md`.
- Nota de continuidad: el rail IA fue ajustado de forma intensa, pero la validacion visual final depende de confirmar el redeploy/caché en produccion.

## Alcance activo
- CRM web para operacion clinica y administrativa.
- Agenda con Google Calendar y sincronizacion CRM.
- Telegram para citas, mensajes e informes.
- Agente IA de ejercicios con PDF clinico y entrega.
- Finanzas: pagos, facturas, bonos y gestoria.
- Documentos administrativos y firmas.

## En pausa
- Generacion de video.
- Portal paciente completo.
- Modularizacion profunda del frontend.

## Arquitectura
- Frontend: Astro.
- Backend: Node.js + Express.
- DB: Supabase PostgreSQL.
- Storage: Supabase Storage bucket `ejercicios`.
- Automatizacion: n8n.
- IA: OpenAI via backend/n8n.
- Agenda: Google Calendar via n8n/backend.

## Validacion habitual
```powershell
cd frontend
npm.cmd run check
npm.cmd run build
```

Backend:
```powershell
cd backend
npm run lint
```

## Produccion
1. Subir cambios a `main`.
2. Raul hace redeploy manual de `fisio-frontend` o `fisio-backend` en EasyPanel cuando corresponda.
3. Verificar que la URL productiva sirve assets nuevos.
4. Smoke test minimo: `Inicio`, `Agenda`, `Finanzas`, `Documentos`, ficha de paciente y agente IA.
5. En cambios del rail IA, confirmar hash de bundle nuevo en `frontend/dist/_astro` y validar que no hay huecos muertos ni bloques duplicados.

## Reglas de continuidad
- No tocar contratos backend/n8n salvo necesidad explicita.
- Mantener cambios pequenos y verificables.
- Si produccion muestra UI antigua, revisar deploy/cache antes de tocar codigo.
- No duplicar checkpoints largos: actualizar `docs/SESSION_CURRENT.md`, `configuracion_pendiente.md` y una entrada breve en `CHANGELOG.md`.
