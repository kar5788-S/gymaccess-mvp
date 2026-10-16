# Implementation Plan: Membresías, pagos, reconocimiento facial y control de acceso (Sprint 2)

**Branch**: `002-sprint2-membresias-pagos-acceso-facial` | **Date**: 2026-10-12 | **Actualizado**: 2026-10-14 (sincronizado con `/speckit.clarify`) | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-sprint2-membresias-pagos-acceso-facial/spec.md`

## Summary

Completar las funciones centrales del gimnasio sobre la base del Sprint 1:
administración de tipos de membresía, asignación y renovación de membresías,
registro y consulta de pagos y adeudos, registro de información facial e
identificación de clientes mediante reconocimiento facial para autorizar o
rechazar su acceso según la vigencia de la membresía, registrando cada intento
y las acciones críticas en auditoría.

Enfoque técnico (según [research.md](research.md)): se mantiene la arquitectura
del Sprint 1 (React + Express con ES Modules, API REST, JWT, MySQL local
versionado). La novedad es `@vladmandic/face-api` en el frontend para detectar
el rostro con la cámara del navegador y calcular un descriptor facial de 128
dimensiones; el descriptor viaja al backend, que lo almacena protegido y
realiza el cotejo en el servidor con distancia euclidiana (umbral configurable
en `.env`), sin que las imágenes ni los descriptores se expongan al frontend ni
a endpoints públicos.

## Technical Context

**Language/Version**: JavaScript (ES2022) en frontend y backend; Node.js 20+
con ES Modules (`"type": "module"` en `backend/package.json`, sin CommonJS).

**Primary Dependencies**: Frontend: React 18 + `@vladmandic/face-api`
(detección y descriptor facial en el navegador con TensorFlow.js — R-13).
Backend: Express, `mysql2`, `jsonwebtoken`, `bcrypt`, `dotenv`,
`express-validator` (heredados del Sprint 1, R-01…R-10); sin dependencias
nuevas en el backend, porque el cotejo de descriptores es aritmética pura
(R-14).

**Storage**: MySQL local — InnoDB, `utf8mb4`; 8 tablas: 5 heredadas del
Sprint 1 (`usuarios`, `clientes`, `tipos_membresia`, `membresias`, `pagos`) y 3
nuevas (`rostros`, `accesos`, `auditoria`); migración
`database/migrations/002_sprint2.sql` y seed de tipos de membresía de ejemplo.

**Testing**: Vitest + Supertest (backend), Vitest + React Testing Library
(frontend) — decisión heredada R-01; el servicio de identificación facial se
prueba con descriptores simulados (vectores de prueba) para no depender de la
cámara en CI.

**Target Platform**: Navegador moderno con cámara (getUserMedia, localhost o
HTTPS) + servidor Node local + MySQL local (desarrollo académico, una sede).

**Project Type**: Web application (`frontend/` + `backend/` + `database/`).

**Performance Goals**: identificación o rechazo facial en menos de 5 s desde la
captura (SC-007); operaciones CRUD de membresías y pagos en menos de 2 s en
entorno local; el resto se mide por SC-001…SC-009 del spec.

**Constraints**: permisos validados en el servidor; sin eliminación ordinaria
de pagos y accesos; datos biométricos protegidos y nunca expuestos en
respuestas (FR-017); una membresía activa por cliente (FR-004); vigencia
inclusiva sin tolerancia (FR-006); pago único en efectivo (FR-007 / R-18);
sin asignar ni renovar mientras haya adeudo pendiente (FR-023 / R-26); la
baja de un cliente elimina su información facial (FR-022 / R-27); la
reactivación conserva la fecha de vencimiento (R-21); ES Modules y consultas
parametrizadas heredadas.

**Scale/Scope**: 1 sede; ~20 usuarios y ~500 clientes; 8 tablas; ~15
pantallas; 9 historias de usuario; 24 FR; 9 criterios de éxito.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitución: `.specify/memory/constitution.md` v1.1.0.

| Principio | Requisito clave | Evidencia en el plan | Estado |
|-----------|-----------------|----------------------|--------|
| I. Alcance y MVP (NC) | Solo alcance del sprint, relación requisito→implementación | Límites de alcance del spec; facial solo identifica clientes registrados en el punto de acceso | PASS |
| II. Arquitectura separada (NC) | Frontend/Backend/BD separados; facial y acceso como módulos independientes | `services/rostro.service.js` y `services/acceso.service.js` separados; el frontend solo captura y envía el descriptor | PASS |
| III. Stack tecnológico | React/JS, Node+Express/JS, MySQL, REST, JWT, bcrypt, sin dependencias innecesarias | Technical Context; `@vladmandic/face-api` justificada en research.md R-13 (libre, local, compatible con JS/React) | PASS |
| IV. Base de datos (NC) | Tablas Sprint 2 (`rostros`, `accesos`, `auditoria`); frontend nunca toca MySQL; cambios documentados | data-model.md; migración `002_sprint2.sql` versionada; información facial tratada como sensible | PASS |
| V. Seguridad (NC) | Permisos en servidor, sin errores internos, información facial protegida | FR-016/FR-017/FR-018; descriptor almacenado como binario y omitido de toda respuesta; umbral en `.env` | PASS |
| VI. Roles y permisos | 4 roles con alcances definidos | Matriz de permisos en `contracts/api.md` (tipos, membresías, pagos, rostros, accesos, auditoría), incluida la consulta de la membresía propia del cliente en modo solo lectura (FR-024) | PASS |
| VII. Integridad de reglas (NC) | FKs correctas; historial financiero y de accesos conservado | data-model.md: FKs, `pagos.membresia_id` NOT NULL, sin DELETE de pagos/accesos | PASS |
| VIII. Facial y acceso | Solo identificar/validar acceso; sin vigilancia ni seguimiento | R-13/R-14/R-16; FR-012…FR-015; identificación solo contra `rostros` de clientes registrados | PASS |
| IX. API y errores | JSON, códigos HTTP, middleware auth/authz, validación, errores centralizados | `contracts/api.md`: envolvente heredada, códigos, `POST /api/accesos/intento` protegido | PASS |
| X. Pruebas | Funciones principales probadas antes de terminar | research.md R-01; pruebas de servicios con descriptores simulados; escenarios de `quickstart.md` | PASS |
| XI. UX/UI | Confirmaciones, mensajes de éxito/error, estados claros | Estados de membresía y resultado de acceso visibles; mensajes claros de rechazo con motivo | PASS |

**Re-check post-Phase 1 (diseño)**: PASS. `data-model.md`,
`contracts/api.md` y `quickstart.md` no introducen violaciones: la información
facial se almacena como descriptor numérico sin exponerlo, los endpoints de
acceso exigen autenticación y rol autorizado, y los escenarios de validación
cubren la lista mínima de pruebas de la constitución (reconocimiento facial,
autorización y rechazo de accesos, registro de accesos, membresías, pagos).
Revisión específica de las 5 aclaraciones del 2026-10-14: el bloqueo por
adeudo (FR-023) y el método único `efectivo` (FR-007) se validan en el
backend; la eliminación de `rostros` en la baja del cliente (FR-022) no
contradice la prohibición de DELETE, que aplica a pagos, accesos y auditoría
(Principio VII); la reactivación conserva la `fecha_vencimiento` (R-21) y la
consulta de membresía propia del cliente (FR-024) es de solo lectura dentro
del alcance del rol Cliente (Principio VI). Sin violaciones que justificar.

## Project Structure

### Documentation (this feature)

```text
specs/002-sprint2-membresias-pagos-acceso-facial/
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
├── package.json         # + @vladmandic/face-api (R-13)
├── public/modelos/      # pesos del modelo facial descargados localmente
└── src/
    ├── components/
    │   ├── camara/      # CapturaFacial.jsx, useCara.js (getUserMedia)
    │   └── ...
    ├── pages/
    │   ├── TiposMembresiaPage.jsx
    │   ├── MembresiasPage.jsx
    │   ├── PagosPage.jsx
    │   ├── RegistrarRostroPage.jsx
    │   ├── AccesoPage.jsx        # terminal de acceso (cámara)
    │   ├── AccesosPage.jsx       # consulta de registros
    │   ├── MiMembresiaPage.jsx   # membresía propia del cliente (FR-024)
    │   └── ...
    ├── services/        # + tipos-membresia.api.js, membresias.api.js,
    │                    #   pagos.api.js, rostros.api.js, accesos.api.js,
    │                    #   auditoria.api.js, descriptor-facial.js
    └── ...

backend/
├── package.json         # sin dependencias nuevas
└── src/
    ├── routes/          # + tipoMembresia, membresia, pago, rostro, acceso, auditoria
    ├── controllers/     # + mismos módulos
    ├── services/        # + tipoMembresia, membresia (vigencia/renovación),
    │                    #   pago (adeudos), rostro (descriptor), acceso
    │                    #   (identificación+validación), auditoria, matching
    ├── models/          # + mismos módulos
    ├── validators/      # + mismos módulos
    └── utils/           # + descriptor.js (float32 <-> Buffer)

database/
├── migrations/
│   ├── 001_initial.sql
│   └── 002_sprint2.sql  # ALTER tipos_membresia/membresias/pagos;
│                        # CREATE rostros, accesos, auditoria
└── seeds/
    └── 002_tipos_membresia.sql
```

**Structure Decision**: se conserva la estructura de tres piezas y el backend
modular del Sprint 1; los módulos nuevos replican el patrón
ruta→controlador→servicio→modelo existente. El reconocimiento facial se
implementa como módulo independiente (`rostro`) que se comunica con el módulo
de control de acceso (`acceso`), conforme al Principio II.

## Complexity Tracking

> Sin violaciones de la constitución (ver Constitution Check); la tabla no
> aplica.
