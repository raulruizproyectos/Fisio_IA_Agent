# Analisis PROET (Frontend + Backend) - 2026-03-04

## Alcance
- Fuente: `https://app.exerciciterapeutic.cat`
- Metodo:
  - inventario de secciones frontend desde build manifest
  - inventario de endpoints backend desde bundles JS
  - validaciones API puntuales con cuenta del profesional

## Resumen ejecutivo
- Endpoints unicos detectados: **148**
- Secciones principales analizadas (sidebar profesional): **9**
- Datos reales extraibles del entorno profesional:
  - programas de usuario: **20**
  - templates top: **59**
  - ejercicios unicos detectados en programas: **179**

## Secciones del frontend (sidebar)
| Seccion | Ruta | #Endpoints detectados | Endpoints principales |
|---|---|---:|---|
| Inici | `/dashboard` | 8 | /api/authentication/auth<br>/api/authentication/switch-language<br>/api/programs/admin/most-used-physio<br>/api/programs/admin/most-used-trainer<br>/api/programs/users/add |
| Crear programa | `/programs/user/new` | 3 | /api/authentication/auth<br>/api/programs/users/count<br>/api/programs/users/new |
| Meus programes | `/programs/user` | 9 | /api/authentication/auth<br>/api/exercises/program-list<br>/api/pdf/download<br>/api/pdf/send/<br>/api/programs/users/add |
| Plantilles | `/programs` | 3 | /api/authentication/auth<br>/api/programs/admin/most-used-physio<br>/api/programs/admin/most-used-trainer |
| Meus exercicis | `/exercises` | 3 | /api/authentication/auth<br>/api/exercises/user/add-exercise<br>/api/exercises/user/full-list |
| Pacients | `/clients` | 3 | /api/authentication/auth<br>/api/clients/add-client-invite<br>/api/clients/user-clients |
| Contacte | `/contact` | 2 | /api/authentication/auth<br>/api/contact/email-support |
| Meu calendari | `/my-calendar` | 10 | /api/authentication/auth<br>/api/clients/add-training-calendar<br>/api/clients/delete<br>/api/clients/details<br>/api/exercises/program-list |
| Meu perfil | `/user/profile` | 4 | /api/authentication/auth<br>/api/users/change-password<br>/api/users/delete-logo-file<br>/api/users/update |

## Backend inferido por modulos API
| Modulo API | #Endpoints |
|---|---:|
| programs | 29 |
| exercises | 23 |
| authentication | 11 |
| users | 11 |
| clients | 10 |
| muscle-zones | 7 |
| organizations | 7 |
| body-parts | 6 |
| materials | 6 |
| targets | 6 |
| exercise-groups | 5 |
| exercise-types | 5 |

## Lo mas aprovechable para Fisio_IA_Agent
1. Marketplace de plantillas (`/api/programs/admin/most-used-physio`) con metrica de adopcion (`clone_count`).
2. Flujo completo de programas personalizados (crear, listar, clonar, detalle, calendario).
3. Biblioteca de ejercicios con media y video embebido.
4. Envio de planes por PDF (descarga y envio remoto).
5. Flujo de invitacion de pacientes (payload con `newClientDetails`, `userDetails`, `locale`, `link`).
6. Soporte multidioma por dominio/locale (es, en, val).

## Oportunidades concretas para mejorar Fisio_IA_Agent
1. `Plantillas inteligentes`: crear modulo de plantillas reutilizables con ranking de uso y clonacion (como PROET).
2. `Prescripcion distribuible`: generar PDF de plan con imagen+descripcion+video y envio por canal.
3. `Onboarding pacientes`: alta/invitacion guiada desde CRM + seguimiento de estado.
4. `Calendario terapeutico`: estado de cumplimiento por sesion (pendiente/completado) y notificacion.
5. `Taxonomia clinica`: ampliar catalogo por zona, material, objetivo, tipo de ejercicio para filtrar mejor W2.

## Riesgos detectados (a vigilar en nuestro proyecto)
1. Acoplamiento fuerte frontend-backend por payloads ad-hoc en POST.
2. Superficie API grande con endpoints mutables; exige control estricto de authz/RLS.
3. Dependencia de locale por dominio hardcodeado (mantenimiento complejo).

## Artefactos generados en esta sesion
- `docs/proet/sections_endpoints_20260304.json`
- `docs/proet/api_groups_20260304.json`
- `docs/data/proet_snapshot_20260304.json`
- `scripts/proet-export.mjs`

