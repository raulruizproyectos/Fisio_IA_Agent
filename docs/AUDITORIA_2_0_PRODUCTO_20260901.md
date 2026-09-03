# Auditoría 2.0 de producto y producción

Fecha: 2026-09-01  
Rama: `production-hardening`

## Decisión de producto

Fisio IA Agent no debe competir mostrando más módulos a la vez. Su ventaja debe ser un circuito clínico más corto y trazable:

1. El profesional selecciona paciente e introduce diagnóstico, síntomas, restricciones y objetivo.
2. La IA propone un plan basado en el catálogo disponible.
3. El fisioterapeuta revisa y aprueba; ninguna propuesta se entrega automáticamente.
4. El informe se archiva en la ficha y puede exportarse a PDF o enviarse por Telegram.
5. Dolor, adherencia, incidencias y ajustes quedan visibles en el seguimiento longitudinal.

La navegación aplica divulgación progresiva: clínica y seguimiento en primer nivel; agenda, captación y finanzas a un clic; configuración y operaciones avanzadas en segundo nivel.

## Referencias del mercado

| Patrón útil | Referencias | Aplicación en Fisio IA Agent |
|---|---|---|
| Notas y ayuda clínica con IA | Serenna, Clinic Cloud | Copiloto contextual, siempre sujeto a revisión profesional |
| Historial y mapa corporal | Tufisio, Docfav, iFisia | Ficha longitudinal con dolor, zona corporal, notas y decisiones |
| Ejercicio terapéutico y adherencia | Fibbel | Informe vinculado, evolución de dolor/adherencia y ajuste del plan |
| Portal/reserva y recordatorios | Docfav, DriCloud, Nubimed | Reserva pública, agenda sincronizada y recordatorios |
| Bonos, caja y facturación | Tufisio, iFisia, Archivex | Área financiera agrupada, fuera del flujo clínico principal |
| Consentimiento y firma | Docfav, Nubimed, Archivex | Documentos y firma desde la ficha del paciente |
| Clases y recursos compartidos | Nubimed, FisioSalus | Candidato posterior; no se añade al inicio para evitar complejidad |

Fuentes públicas consultadas: [Docfav](https://pro.docfav.com/software-para-fisioterapeutas), [DriCloud](https://dricloud.com/software-fisioterapia/), [Nubimed](https://www.nubimed.com/software-fisioterapia/), [Clinic Cloud](https://clinic-cloud.com/software-gestion-centro-terapias-fisicas), [iFisia](https://ifisia.com/funcionalidades/) y [Archivex Clinical](https://archivexclinical.com/caracteristicas/gestion-en-la-nube).

## Mejoras incorporadas

- Acción principal de dashboard y navegación dedicada a “Nuevo plan con IA”.
- Explicación visual breve del recorrido diagnóstico → propuesta → validación → seguimiento.
- Indicador dinámico del estado del plan dentro del copiloto.
- Revisión profesional obligatoria antes de PDF o Telegram.
- Trazabilidad del informe, entrega y seguimiento en la ficha del paciente.
- RLS y separación por profesional reforzados en PostgreSQL.
- Webhooks n8n firmados y exports desactivados para evitar triggers duplicados.
- Readiness de integraciones sin revelar claves.
- Diferenciación explícita entre Gmail para alertas internas y canales de paciente.

## Rendimiento y recursos

Medición local de build de producción:

- Astro: 4 páginas estáticas en menos de 1 segundo en el entorno de auditoría.
- Eliminación de una fuente embebida duplicada: ahorro aproximado de 544 KB comprimidos por primera carga.
- Importación específica de Google Calendar: reducción medida cercana a 100 MB de memoria de arranque frente a cargar todo `googleapis`, y unos 500 ms menos de inicialización del módulo.
- Assets con hash: caché inmutable de un año; assets con nombre estable: caché revalidable de siete días.
- Listados de pacientes, pagos y documentos acotados para evitar respuestas sin límite.

Presupuestos para staging:

| Métrica | Objetivo |
|---|---:|
| LCP escritorio | ≤ 2,0 s |
| LCP móvil | ≤ 2,5 s |
| CLS | ≤ 0,05 |
| INP | ≤ 200 ms |
| API p95 sin IA | ≤ 500 ms |
| Apertura ficha p95 | ≤ 800 ms |
| Generación IA | progreso visible en ≤ 1 s y trabajo asíncrono |

## Pendientes que requieren el entorno real

- Verificar en EasyPanel variables, consumo, health checks y caché HTTP.
- Comprobar en n8n las credenciales OAuth de Gmail y Google Calendar sin activar duplicados.
- Probar Telegram con cuentas de prueba y confirmar el registro en la ficha.
- Medir Core Web Vitals sobre la URL pública de staging en móvil, portátil y escritorio.
- Aplicar la migración a producción únicamente tras aprobación explícita y backup.

No se considera producción lista hasta completar esas pruebas reales y documentar rollback.
