# Reglas Canónicas de Desarrollo — Fisio Clinical

Guía operativa obligatoria para cualquier agente o desarrollador que modifique este repositorio.

## 1. Dónde Consultar Antes de Tocar Código
- **Estado Actual y Prioridades**: `docs/STATUS.md` (fuente canónica del estado presente).
- **Arquitectura y Modelo de Datos**: `docs/ARCHITECTURE.md` (componentes, flujos y ER).
- **Operaciones y Despliegue**: `docs/OPERATIONS.md` (entorno, comandos y migraciones).
- **Historial de Cambios**: `docs/CHANGELOG.md`.

## 2. Comandos de Validación Obligatorios
Antes de dar por concluida cualquier tarea o proponer un commit:
```bash
# Backend: lint y suite de tests (debe pasar la suite actual)
cd backend && npm run lint && npm test

# Frontend: chequeo de tipos y compilación estática (0 errores)
cd ../frontend && npm run check && npm run build
```

## 3. Seguridad y Secretos (Tolerancia Cero)
- **Fuente única de secretos locales**: `.env.local` en la raíz del proyecto.
- **Prohibición**: NUNCA commitear claves, tokens ni passwords (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `TELEGRAM_BOT_TOKEN`, etc.).
- `SUPABASE_SERVICE_ROLE_KEY` solo puede utilizarse en backend o n8n; NUNCA exponerla al frontend ni en variables `PUBLIC_*`.
- En Supabase Storage, el bucket de ejercicios clínicos es privado con URLs firmadas JIT.

## 4. Norma de Robustez Clínica
- Todo flujo crítico debe disponer de *fallback* funcional y registrar trazabilidad (`request_id`, contexto, error).
- Ningún fallo en un servicio externo (Google Calendar, Telegram, n8n, OpenAI) debe bloquear completamente el flujo asistencial principal.
- Respuestas claras y seguras en degradación controlada.

## 5. Gating Clínico e Integridad Médica
- Los planes de ejercicios generados por el sistema nacen en `requiere_revision`.
- Queda terminantemente bloqueada la generación de PDF (`/api/documents/exercise-plan/pdf`) o el envío al paciente si la recomendación no está explícitamente `aprobada` por el fisioterapeuta.
- Ante *red flags* clínicas, se exige una justificación profesional documentada de al menos 12 caracteres.
- Al sustituir un ejercicio por apoyo visual, el nuevo ejercicio debe adoptar sus propias precauciones y dosificación (nunca heredar contraindicaciones de otro).

## 6. Frontend y Sistema de Diseño (v6.0 Precisión azul)
- **Contratos DOM**: NUNCA modificar ni eliminar IDs ni atributos `data-*` en `frontend/src/pages/index.astro` ni en los componentes de `views/*`, ya que son requeridos para la hidratación reactiva.
- **Dirección elegida por el usuario**: Precisión azul, DESIGN.md v6. Navegación y tarjetas blancas, lienzo #f4f7fb, texto #142234 y azul #175dd0. No reintroducir las reglas verde/coral anteriores.
- **Acciones y estados**: azul para acción/orientación; rojo/ámbar/verde solo para estados semánticos con etiquetas. Movimiento discreto, reducido cuando lo solicita el sistema; controles de 44 px y foco visible.
- **Tipografía**: DM Sans con `font-feature-settings: "ss03" 1` en toda la interfaz.
- **Responsive**: Compatibilidad obligatoria en escritorio (1280px+) y móvil (375px+).

## 7. Automatizaciones en n8n
- Antes de crear un nuevo nodo o workflow, revisar los existentes en `n8n/Fisio_IA_Agent`.
- Todo webhook debe estar autenticado con cabecera de secreto (`N8N_WEBHOOK_SECRET`).
