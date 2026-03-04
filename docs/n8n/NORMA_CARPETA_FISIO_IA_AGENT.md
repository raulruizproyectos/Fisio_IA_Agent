# Norma Obligatoria - Carpeta n8n `Fisio_IA_Agent`

## Regla (obligatoria)
Todo workflow nuevo o modificado de este proyecto debe quedar **dentro de la carpeta/tag `Fisio_IA_Agent`** en n8n.

No se considera terminado un cambio en n8n si el workflow aparece fuera de esa carpeta/tag.

## Requisitos minimos por workflow
1. Nombre con prefijo: `Fisio_IA_Agent / ...`
2. Asignado a carpeta/tag: `Fisio_IA_Agent`
3. Versionado en repo bajo `n8n/Fisio_IA_Agent/` (`production/` o `vnext/` segun corresponda)

## Checklist de verificacion (obligatorio)
1. Verificar en UI que el workflow aparece dentro de `Fisio_IA_Agent`.
2. Verificar por API o auditoria local que no hay workflows del proyecto fuera de carpeta/tag.
3. Registrar el cambio en:
   - `CHANGELOG.md`
   - `configuracion_pendiente.md`

## Criterio de bloqueo
Si la API de n8n no permite etiquetar/mover (`tags/folder`), se debe hacer movimiento manual en UI **antes de cerrar la sesion**.

## Definicion de done
Un cambio en n8n esta `DONE` solo si:
- workflow funcionalmente correcto,
- dentro de carpeta/tag `Fisio_IA_Agent`,
- y documentado en repo.
