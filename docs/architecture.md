# Arquitectura del Sistema â€” Fisio_IA_Agent

## Diagrama general

```mermaid
graph TB
    subgraph Frontend["Frontend (Astro)"]
        PP["Portal Profesional"]
        PPT["Portal Paciente"]
        PM["Panel de MÃ©tricas"]
    end

    subgraph Backend["Backend (Node.js/Express)"]
        AUTH["Auth & Roles"]
        PRESC["Motor de PrescripciÃ³n"]
        RENDER["GestiÃ³n de Render"]
        API["API REST"]
    end

    subgraph Database["Supabase (PostgreSQL)"]
        DB["Base de datos"]
        STORAGE["Storage (vÃ­deos)"]
        SAUTH["Supabase Auth"]
    end

    subgraph Automation["AutomatizaciÃ³n"]
        N8N["n8n Workflows"]
    end

    PP --> API
    PPT --> API
    PM --> API
    API --> AUTH
    API --> PRESC
    API --> RENDER
    AUTH --> SAUTH
    PRESC --> DB
    RENDER --> DB
    RENDER --> STORAGE
    N8N --> API
    N8N --> DB
```

## Componentes

### Frontend (Astro)

| Componente | DescripciÃ³n |
|---|---|
| **Portal Profesional** | GestiÃ³n de pacientes, prescripciÃ³n de ejercicios, generaciÃ³n de vÃ­deos, seguimiento |
| **Portal Paciente** | Acceso a planes, visualizaciÃ³n de vÃ­deos, registro de dolor/ejecuciÃ³n |
| **Panel de MÃ©tricas** | Dashboard con KPIs, adherencia, evoluciÃ³n, alertas |

### Backend (Node.js/Express)

| MÃ³dulo | Responsabilidad |
|---|---|
| **Auth & Roles** | AutenticaciÃ³n vÃ­a Supabase Auth, middleware de roles (profesional/paciente/admin) |
| **Motor de PrescripciÃ³n** | Reglas clÃ­nicas configurables, recomendaciÃ³n de ejercicios segÃºn dolencia+fase |
| **GestiÃ³n de Render** | Cola de jobs de renderizado, estado del render, asociaciÃ³n a planes |
| **API REST** | Endpoints CRUD para todas las entidades del modelo |

### Base de datos (Supabase)

- **PostgreSQL** con RLS (Row Level Security) para aislamiento de datos.
- **Supabase Auth** para gestiÃ³n de usuarios y sesiones.
- **Supabase Storage** para almacenamiento de vÃ­deos renderizados.

### AutomatizaciÃ³n (n8n)

- Recordatorios de sesiones pendientes.
- Alertas por baja adherencia.
- Notificaciones de progreso al profesional.
- Webhooks para eventos del sistema.

---

## Flujo de datos â€” PrescripciÃ³n de ejercicios

```mermaid
sequenceDiagram
    participant P as Profesional
    participant F as Frontend
    participant A as API
    participant DB as Supabase
    participant R as Render Engine

    P->>F: Selecciona dolencia + fase
    F->>A: GET /ejercicios?condition=X&phase=Y
    A->>DB: Query ejercicios filtrados
    DB-->>A: Lista de ejercicios
    A-->>F: Ejercicios recomendados
    P->>F: Ajusta parÃ¡metros + confirma plan
    F->>A: POST /planes (con items)
    A->>DB: Crea plan + items
    A->>R: Encola render jobs
    R-->>DB: Actualiza estado del job
    A-->>F: Plan creado con estado pendiente
```

## Flujo de datos â€” Seguimiento del paciente

```mermaid
sequenceDiagram
    participant PT as Paciente
    participant F as Frontend
    participant A as API
    participant DB as Supabase
    participant N as n8n

    PT->>F: Registra sesiÃ³n (dolor, notas)
    F->>A: POST /sesiones
    A->>DB: Guarda workout + items
    A->>DB: Recalcula adherencia
    DB-->>A: MÃ©tricas actualizadas
    A-->>F: ConfirmaciÃ³n
    
    alt Adherencia baja o dolor alto
        A->>N: Webhook de alerta
        N->>N: Genera notificaciÃ³n
    end
```
