# Implementation Plan: Base del sistema, usuarios y clientes (Sprint 1)

**Branch**: `001-sprint1-auth-clientes` | **Date**: 2026-10-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-sprint1-auth-clientes/spec.md`

## Summary

Construir la base funcional del sistema de gestión del gimnasio: inicio de
sesión con roles, administración de usuarios por el administrador, y gestión
(crear, modificar, consultar) de clientes con los permisos por rol definidos
en el spec, dejando las tablas de membresías y pagos preparadas sin
operarlas.

Enfoque técnico (según [research.md](research.md)): aplicación web con
frontend React y backend Express en JavaScript con ES Modules, comunicación
por API REST con autenticación JWT (8 h), contraseñas con bcrypt, y MySQL
local con migraciones SQL versionadas. Las pruebas usan Vitest + Supertest
(backend) y Vitest + React Testing Library (frontend).

## Technical Context

**Language/Version**: JavaScript (ES2022) en frontend y backend; Node.js 20+
con ES Modules (`"type": "module"` en `backend/package.json`, sin CommonJS).

**Primary Dependencies**: Frontend: React 18. Backend: Express, `mysql2`,
`jsonwebtoken`, `bcrypt`, `dotenv`, `express-validator` (todas justificadas
en research.md R-01…R-10). Sin ORM ni librería de componentes UI.

**Storage**: MySQL local — InnoDB, `utf8mb4`, 5 tablas operativas
(`usuarios`, `clientes`, `tipos_membresia`, `membresias`, `pagos`), migraciones
y seeds SQL versionados en `database/`.

**Testing**: Vitest + Supertest (backend), Vitest + React Testing Library
(frontend) — decisión R-01.

**Target Platform**: Navegador moderno + servidor Node local + MySQL local
(desarrollo académico, una sede).

**Project Type**: Web application (`frontend/` + `backend/` + `database/`).

**Performance Goals**: login en menos de 10 s (SC-002), operaciones CRUD de
usuarios/clientes en menos de 2 s en entorno local; el resto se mide por
SC-001…SC-008 del spec.

**Constraints**: sesión de 8 h (Q5); bloqueo de 15 min tras 5 fallos (Q3);
contraseña ≥ 8 con mayúscula y número (Q1); permisos validados en el
servidor; sin eliminación física de registros; solo el backend accede a MySQL;
duplicados de cliente con aviso y confirmación (Q4).

**Scale/Scope**: 1 sede; ~20 usuarios y ~500 clientes; 8 tablas definidas
(5 operativas + 3 de estructura); ~9 pantallas; 5 historias de usuario;
17 FR; 8 criterios de éxito.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitución: `.specify/memory/constitution.md` v1.1.0.

| Principio | Requisito clave | Evidencia en el plan | Estado |
|-----------|-----------------|----------------------|--------|
| I. Alcance y MVP (NC) | Solo alcance del sprint, relación requisito→implementación | Límites de alcance del spec; membresías/pagos solo estructura; facial solo preparación (FR-017, FR-018) | PASS |
| II. Arquitectura separada (NC) | Frontend/Backend/BD separados; backend modular | Estructura de proyecto más abajo; lógica en `services/`, rutas en `routes/` | PASS |
| III. Stack tecnológico | React/JS, Node+Express/JS, MySQL, REST, JWT, bcrypt, env vars, sin dependencias innecesarias | Technical Context + justificación por dependencia en research.md | PASS |
| IV. Base de datos (NC) | Tablas Sprint 1; frontend nunca toca MySQL; cambios documentados | data-model.md (5 tablas + 3 estructura); migraciones versionadas; credenciales solo en backend | PASS |
| V. Seguridad (NC) | Hash de contraseñas, `.env` fuera del repo, permisos en servidor, validación de entradas, sin errores internos | FR-002/011/012/013; R-05, R-06, R-10; `.env.example` en estructura; envolvente de error genérica en `contracts/api.md` | PASS |
| VI. Roles y permisos | 4 roles con alcances definidos | Matriz de permisos en `contracts/api.md`; FR-003…FR-010 | PASS |
| VII. Integridad de reglas (NC) | FKs correctas; historial conservado; sin borrados ordinarios | data-model.md: FKs e índices; FR-014 (sin DELETE) | PASS |
| VIII. Facial y acceso | Solo identificar/validar acceso; nada en Sprint 1 | Fuera de alcance; FR-018 solo deja la relación preparada | PASS (N/A este sprint) |
| IX. API y errores | JSON, códigos HTTP, middleware auth/authz, validación, errores centralizados | `contracts/api.md`: envolvente, códigos, middlewares, validación | PASS |
| X. Pruebas | Funciones principales probadas antes de terminar | research.md R-01; escenarios de `quickstart.md` (login, roles, clientes, permisos) | PASS |
| XI. UX/UI | Confirmaciones, mensajes de éxito/error, estados claros | FR-015; escenarios US1–US5 con mensajes claros | PASS |

**Re-check post-Phase 1 (diseño)**: PASS. `data-model.md`,
`contracts/api.md` y `quickstart.md` no introducen violaciones: se mantienen
las 5 tablas del Sprint 1, el contrato exige permisos en servidor y errores
genéricos, y los escenarios de validación cubren la lista mínima de pruebas.
Sin violaciones que justificar.

## Project Structure

### Documentation (this feature)

```text
specs/001-sprint1-auth-clientes/
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
├── package.json
├── index.html
└── src/
    ├── components/
    ├── pages/
    ├── services/        # llamadas a la API
    ├── context/         # estado de sesión (Context API, R-02)
    └── styles/

backend/
├── package.json         # "type": "module"
├── .env.example
├── src/
│   ├── config/          # pool de MySQL, JWT
│   ├── routes/
│   ├── controllers/
│   ├── services/        # lógica de negocio (login, bloqueo, duplicados)
│   ├── models/          # consultas parametrizadas
│   ├── middlewares/     # autenticación y autorización por rol
│   ├── validators/      # reglas express-validator
│   └── utils/
└── tests/
    ├── contract/
    ├── integration/
    └── unit/

database/
├── README.md
├── migrations/          # scripts SQL versionados (001_initial.sql, …)
├── seeds/               # 001_admin_inicial.sql (R-11)
└── scripts/

.env.example             # sin secretos
.gitignore               # incluye .env
README.md
```

**Structure Decision**: aplicación web de tres piezas (Opción 2 de la
plantilla): `frontend/` (React), `backend/` (Express, backend modular con
las carpetas que exige la constitución) y `database/` (migraciones y seeds).
Se añaden `tests/` bajo `backend/` por el Principio X (pruebas obligatorias);
no se crean carpetas alternativas (`client/`, `server/`, `dataBase/`).

## Complexity Tracking

> Sin violaciones de la constitución (ver Constitution Check); la tabla no
> aplica.
