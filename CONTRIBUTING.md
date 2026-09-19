# Contributing Guide

## Objetivo
Mantener Fisio Clinical estable, seguro y trazable entre frontend, backend, n8n y Supabase.

## Reglas operativas
- Leer siempre `AGENTS.md` antes de realizar cambios en el repositorio.
- No subir secretos ni credenciales (`.env.local` es la única fuente local).
- Todo nuevo flujo de n8n debe versionarse en `n8n/Fisio_IA_Agent` y usar cabecera secreta.
- Al cerrar una fase relevante, registrar el checkpoint en `docs/CHANGELOG.md` y actualizar `docs/STATUS.md`.

## Validación obligatoria
Antes de abrir una PR o crear un commit, deben ejecutarse y pasar:
```bash
cd backend && npm run lint && npm test
cd ../frontend && npm run check && npm run build
```

## Flujo de trabajo
1. Crear rama descriptiva desde `main` o rama de trabajo asignada.
2. Implementar cambios mínimos y modulares.
3. Ejecutar suite de pruebas y checks estáticos.
4. Actualizar documentación canónica (`docs/STATUS.md`, `docs/CHANGELOG.md`).
5. Abrir PR contra `main` utilizando la plantilla de `.github/PULL_REQUEST_TEMPLATE.md`.
