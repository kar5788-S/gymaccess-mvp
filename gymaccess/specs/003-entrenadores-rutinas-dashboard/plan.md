# Implementation Plan: Entrenadores, rutinas de entrenamiento y dashboard administrativo (Sprint 3)

**Branch**: `003-entrenadores-rutinas-dashboard` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-entrenadores-rutinas-dashboard/spec.md`

## Summary

Completar sobre la base de los Sprints 1 y 2 la capa de coaching y
seguimiento: gestión de perfiles de entrenadores ligados a cuentas con rol
`entrenador`, asignación de clientes a entrenadores con historial de
vigencias (una responsable activa por cliente), creación y consulta de rutinas
con ejercicios, registro de objetivos y progresos con historial conservado,
consulta de su propia rutina y evolución por parte de cada cliente, y un
dashboard de indicadores para el administrador con panel propio para el
entrenador, con permisos validados en el servidor y auditoría de los cambios
relevantes.

Enfoque técnico (según [research.md](research.md)): se mantiene la
arquitectura heredada (React + Express con ES Modules, API REST, JWT, MySQL
local versionado) **sin dependencias nuevas**. Los módulos nuevos replican el
patrón ruta→controlador→servicio→modelo; la migración
`database/migrations/003_sprint3.sql` crea 6 tablas más la vista
`estadisticas_dashboard` (R-36); el dashboard se calcula en el backend con
consultas agregadas por periodo (R-33); `MATRIZ_PERMISOS` se amplía con las
claves del sprint y los servicios añaden la verificación de pertenencia a la
carga del entrenador (R-34), cerrando así la doble capa de autorización que
exigen las aclaraciones del 2026-10-15.

## Technical Context

**Language/Version**: JavaScript (ES2022) en frontend y backend; Node.js 20+
con ES Modules (`"type": "module"` en `backend/package.json`, sin CommonJS —
exigido por el insumo, sección 1).

**Primary Dependencies**: Frontend: React 18 (heredado; `@vladmandic/face-api`
sigue presente por el módulo facial del Sprint 2 y no se usa en este alcance).
Backend: Express, `mysql2`, `jsonwebtoken`, `bcrypt`, `dotenv`,
`express-validator` (heredadas de R-01…R-10); **sin dependencias nuevas en
ningún extremo**: los indicadores del dashboard son SQL agregado sobre las
tablas existentes (R-33).

**Storage**: MySQL local — InnoDB, `utf8mb4`; 6 tablas nuevas
(`entrenadores`, `asignaciones_entrenador`, `rutinas`, `ejercicios_rutina`,
`objetivos_entrenamiento`, `progresos_clientes`) + vista
`estadisticas_dashboard`; migración `database/migrations/003_sprint3.sql`;
sin cambios en tablas existentes y sin seeds nuevos (R-36).

**Testing**: Vitest + Supertest (backend), Vitest + React Testing Library
(frontend) — decisión heredada R-01; pruebas de servicios con mocks en
memoria (patrón del Sprint 2) y baterías de permisos por rol.

**Target Platform**: Navegador moderno + servidor Node local + MySQL local
(desarrollo académico, una sede). Este sprint no usa cámara ni información
facial.

**Project Type**: Web application (`frontend/` + `backend/` + `database/`).

**Performance Goals**: dashboard en menos de 3 s (SC-006); alta de entrenador
+ asignación en menos de 2 min (SC-002); rutina con 3 ejercicios en menos de
3 min (SC-003); operaciones CRUD en menos de 2 s en entorno local.

**Constraints**: permisos validados en el servidor en dos capas — matriz por
rol y pertenencia a la carga (R-34, FR-021); un solo entrenador principal
activo por cliente con cierre automático del anterior (FR-005, clarify Q2);
una sola rutina activa por cliente con archivado automático (FR-010, clarify
Q3); cliente en solo lectura sobre lo suyo (clarify Q4); recepcionista lee
rutinas pero no objetivos ni progresos (clarify Q5); dashboard completo solo
para administrador y panel sin cifras financieras para el entrenador (clarify
Q1); sin `DELETE` en la API; historial de asignaciones, rutinas, objetivos y
progresos conservado; auditoría de cambios relevantes (FR-023); ES Modules y
consultas parametrizadas heredadas.

**Scale/Scope**: 1 sede; ~20 usuarios y ~500 clientes; 6 tablas + 1 vista;
~6 páginas nuevas; 7 historias de usuario; 26 FR; 10 criterios de éxito.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitución: `.specify/memory/constitution.md` v1.1.0.

| Principio | Requisito clave | Evidencia en el plan | Estado |
|-----------|-----------------|----------------------|--------|
| I. Alcance y MVP (NC) | Solo alcance del sprint, relación requisito→implementación | Límites de alcance del spec (sin clases masivas, asistencia grupal ni reportes complejos); el dashboard corresponde a "dashboard administrativo / reportes básicos" del MVP; supuesto de sincronización documental registrado en el spec | PASS |
| II. Arquitectura separada (NC) | Frontend/Backend/BD separados; módulos independientes | Módulos `entrenador`, `asignacion`, `rutina`, `objetivo`, `progreso` y `dashboard` con patrón ruta→controlador→servicio→modelo; el frontend solo consume la API (R-34, R-37) | PASS |
| III. Stack tecnológico | React/JS, Node+Express/JS, MySQL, REST, JWT, sin dependencias innecesarias | Technical Context: 0 dependencias nuevas; agregados en SQL puro (R-33) | PASS |
| IV. Base de datos (NC) | Scripts de BD versionados por sprint; frontend nunca toca MySQL; cambios documentados | data-model.md; `003_sprint3.sql` con 6 tablas + vista y sin ALTER sobre existentes; solo lectura de `membresias`/`accesos` para indicadores; justificación de la tercera etapa en Complexity Tracking | PASS (justificado) |
| V. Seguridad (NC) | Permisos en servidor, sin errores internos, información sensible protegida | FR-018/FR-019/FR-021; matriz ampliada + pertenencia a la carga con `403` (R-34); códigos nuevos con mensaje claro sin detalle interno (contracts/api.md) | PASS |
| VI. Roles y permisos | 4 roles con alcances definidos; entrenador sin información financiera | Matriz ampliada en `contracts/api.md`: entrenador escribe solo en su carga y nunca ve importes; recepcionista asigna y lee rutinas sin progresos; cliente solo lectura de lo propio; dashboard admin / panel del entrenador (clarify Q1, Q4, Q5). El insumo del Sprint 3 amplía el alcance de escritura del entrenador y queda sujeto a la sincronización documental al cierre | PASS |
| VII. Integridad de reglas (NC) | FKs correctas; historial conservado; sin borrado ordinario | data-model.md: FK `RESTRICT`/`SET NULL`; sin `DELETE` en endpoints — estados `inactivo`, `cerrada`, `archivada` (FR-010, FR-025) | PASS |
| VIII. Facial y acceso | Solo identificar/validar acceso; sin vigilancia ni seguimiento indebido | No se modifica el módulo facial ni el de acceso; FR-026: la información del entrenamiento se usa solo para seguimiento del cliente y apoyo operativo | PASS |
| IX. API y errores | JSON, códigos HTTP, middleware auth/authz, validación, errores centralizados | contracts/api.md: envolvente y validadores heredados, 4 códigos nuevos (`ENTRENADOR_NO_VALIDO`, `USUARIO_YA_ENTRENADOR`, `CLIENTE_SIN_ENTRENADOR`, `FUERA_DE_CARGA`) | PASS |
| X. Pruebas | Funciones principales probadas antes de terminar | research.md R-01 heredada; suites por servicio con mocks; quickstart escenarios 1-36 | PASS |
| XI. UX/UI | Confirmaciones, mensajes de éxito/error, estados claros | Cada operación responde con mensaje claro; estados vacíos de "sin rutina activa", "carga 0" y dashboard sin datos; denegaciones explicadas (spec HU3/HU5/HU6) | PASS |

**Re-check post-Phase 1 (diseño)**: PASS. `data-model.md`,
`contracts/api.md` y `quickstart.md` no introducen violaciones: la vista
`estadisticas_dashboard` se lee exclusivamente desde el backend, la matriz y
la verificación de carga mantienen los permisos en el servidor, el historial
no admite borrados y los escenarios del quickstart cubren la lista mínima de
pruebas de la constitución (usuarios y roles, clientes, asignaciones,
rutinas, objetivos y progresos, dashboard por rol, auditoría). Revisión
específica de las 5 aclaraciones del 2026-10-15: el panel del entrenador (Q1)
excluye cifras financieras (Principio VI); el cierre automático de
asignaciones (Q2) y el archivado de rutinas (Q3) conservan el historial
(Principio VII); la exclusión de escritura del cliente (Q4) y la lectura
parcial del recepcionista (Q5) quedan en la matriz con `403` en el servidor
(Principio V). Única justificación registrada: la tercera etapa de la base de
datos del Principio IV (ver Complexity Tracking). Sin otras violaciones que
justificar.

## Project Structure

### Documentation (this feature)

```text
specs/003-entrenadores-rutinas-dashboard/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── api.md           # Contrato REST: endpoints, permisos, códigos
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit.specify)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
frontend/
└── src/
    ├── pages/
    │   ├── EntrenadoresPage.jsx   # personal completo y carga (HU1, HU7)
    │   ├── AsignacionesPage.jsx   # asignar/cerrar entrenador (HU2)
    │   ├── RutinasPage.jsx        # rutinas y ejercicios (HU3)
    │   ├── SeguimientoPage.jsx    # objetivos y progresos (HU4)
    │   ├── DashboardPage.jsx      # admin completo | panel del entrenador (HU6)
    │   └── MiRutinaPage.jsx       # rutina y evolución del cliente (HU5)
    ├── services/                  # + entrenadores.api.js, asignaciones.api.js,
    │                              #   rutinas.api.js, seguimiento.api.js,
    │                              #   dashboard.api.js (patrón heredado)
    └── App.jsx                    # + entradas en VISTAS por rol (R-37)

backend/
├── package.json         # sin dependencias nuevas ("type": "module")
└── src/
    ├── routes/          # + entrenador, asignacion, rutina, objetivo, progreso,
    │                    #   dashboard; cliente.routes.js + /mio/rutina, /mio/progreso
    ├── controllers/     # + mismos módulos
    ├── services/        # + entrenador, asignacion (cierre en transacción),
    │                    #   rutina (una activa + archivado), objetivo,
    │                    #   dashboard (agregados por periodo)
    ├── models/          # + mismos módulos
    ├── validators/      # + mismos módulos
    └── middlewares/     # authorization.js: MATRIZ_PERMISOS ampliada (R-34)

backend/tests/           # + entrenador, asignacion, rutina, seguimiento,
                         #   dashboard, cliente-mio-rutina, permisos-sprint3

database/
├── migrations/
│   ├── 001_initial.sql
│   ├── 002_sprint2.sql
│   └── 003_sprint3.sql  # CREATE entrenadores, asignaciones_entrenador,
│                        #   rutinas, ejercicios_rutina,
│                        #   objetivos_entrenamiento, progresos_clientes
│                        #   + vista estadisticas_dashboard
└── seeds/               # sin seeds nuevos (R-36)
```

**Structure Decision**: se conserva la estructura de tres piezas y el backend
modular de los sprints anteriores; cada módulo nuevo replica el patrón
ruta→controlador→servicio→modelo→validador. El seguimiento se divide en dos
módulos de datos (`objetivo` y `progreso`) para que la matriz de permisos y
la auditoría distingan metas de avances, mientras que la vista de
seguimiento del cliente y el panel del entrenador reutilizan esos servicios.
El dashboard es un módulo de solo lectura que se comunica con los modelos
existentes sin escribir en ellos (Principio II).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Principio IV establece que "la base de datos DEBE desarrollarse en dos sprints" y este sprint añade una tercera etapa (6 tablas + vista) | El insumo autorizado `docs/sprints/sprint-3.md` (secciones 5 y 8) exige modelar entrenadores, asignaciones, rutinas, ejercicios, objetivos, progresos y resúmenes del dashboard, entidades que no caben en las tablas de los sprints 1-2 sin sobrecargarlas y perder el historial de seguimiento | Reaprovechar `clientes`/`membresias` con columnas de entrenamiento no representa la relación entrenador-usuario ni las vigencias de asignación; la constitución admite cambios de alcance cuando se documentan, por lo que el spec registra como supuesto la sincronización de `project-context.md`, `reglas.md` y la constitución al cierre del sprint (Principio I y Gobernanza) |
