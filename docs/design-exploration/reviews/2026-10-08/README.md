# Revisión del acabado Precisión azul

Revisión local del 8 de octubre de 2026, posterior al cierre de las 16:08 Europe/Madrid. Las 39 capturas de la galería fueron examinadas visualmente. La dirección aprobada sigue siendo DESIGN.md v6: DM Sans, blanco/azul, lienzo #f4f7fb, controles de 44 px y movimiento discreto. El usuario la acepta por ahora y pide avanzar al testing en producción; consultar PRODUCTION_TESTING.md para el estado posterior.

| Hallazgo | Ajuste | Base de la decisión |
| --- | --- | --- |
| Correo largo ocupa tres líneas en el saludo móvil | Saludo sin correo; nombre conservado cuando existe | Jerarquía y legibilidad del inicio, brief vigente |
| Tres acciones comprimidas en Pacientes a 375 px | Alta principal en una fila, secundarias en dos columnas | Separación de acciones de Ramp y controles táctiles de DESIGN.md |
| Icono de búsqueda toca el texto | Padding izquierdo explícito | Craft de formularios de refero-design |
| Descripciones de métricas recortadas | Texto con salto de línea en directorio y ficha | Lectura clínica y densidad legible de DESIGN.md |
| Lista y tabla repiten registros/ausencia | Tabla en escritorio, tarjetas pobladas en móvil; carga/vacío/error conservan la tabla | Un solo contenido legible por ancho; estados explícitos del contrato vigente |
| Registros móviles con importes/acciones pegados y error de Documentos recortado | Espaciado de tarjetas, métricas y acciones táctiles de 44 px; aviso de error dentro del contenedor | Tokens v6 y lectura de estados del brief vigente |

Fuentes modificadas: `frontend/src/pages/index.astro`, `precision-blue.css`, `precision-patients.css` y `precision-ficha.css`. No cambian IDs/data-*, permisos, Auth, Calendar, revisión profesional ni persistencia. ARCHITECTURE.md corrige su referencia histórica verde/coral a la dirección vigente.

Verificación fresca:

- `npm run check`: 39 archivos, cero errores, avisos e hints.
- `npm run build`: cuatro páginas compiladas; aviso de Astro sobre Shiki/estilos inline y CSP, sin fallo de compilación.
- `node scripts/test-dashboard-greeting.mjs`: cuatro casos, incluido correo sin nombre. Primero falló con el título anterior y pasa tras el ajuste.
- `node scripts/test-browser-policy.mjs`: CSP y hashes de los cuatro HTML compilados pasan.
- `node tmp/check-blue-polish.mjs`: 45 estados, sin overflow, errores JS ni tráfico externo. 21 estados de inicio/directorio/ficha y cuatro módulos vacíos a 375/768/1280; otros 24 cubren lectura poblada/error de facturas/bonos/documentos/gestoría. Recibo: [verification.json](verification.json).

El ensayo reutiliza la API/SQL de pacientes/citas existente en una clínica ficticia independiente. Los registros administrativos y respuestas 503 son dobles HTTP de lectura; no se realizaron cobros, aprobaciones, descargas de PDF ni envíos. Los screenshots `*-populated-375.jpg` y `*-error-375.jpg` muestran el contenido después de desplazar la pantalla. Los 14 screenshots de las vistas ajustadas actualizan la galería; `before/` conserva sus originales.

| Muestra móvil ficticia | Registros | Fallo de lectura |
| --- | --- | --- |
| Facturas | [Ver tarjeta](blue-facturas-populated-375.jpg) | [Ver aviso](blue-facturas-error-375.jpg) |
| Bonos | [Ver tarjeta](blue-bonos-populated-375.jpg) | [Ver aviso](blue-bonos-error-375.jpg) |
| Documentos | [Ver tarjeta](blue-documentos-populated-375.jpg) | [Ver aviso](blue-documentos-error-375.jpg) |
| Gestoría | [Ver tarjeta](blue-gestoria-populated-375.jpg) | [Ver aviso](blue-gestoria-error-375.jpg) |

Un helper de QA esperaba todas las animaciones, incluida una infinita; se detuvo y se corrigió para esperar solo animaciones finitas, como el ensayo anterior. No se tocaron animaciones del producto por ese bloqueo.

No se repitieron backend, Calendar ni la auditoría de seguridad. Proveedores reales, PostgREST/Auth, proxy/nginx/HTTPS, móvil físico, WCAG integral y todas las operaciones administrativas siguen sin acreditar. Sin dependencias nuevas, SQL Cloud, despliegues, mensajes, credenciales, commits ni push.
