---

description: "Task list template for feature implementation"
---

# Tasks: Base del sistema, usuarios y clientes (Sprint 1)

**Input**: Design documents from `/specs/001-sprint1-auth-clientes/`

**Prerequisites**: [plan.md](plan.md) (required), [spec.md](spec.md) (required for user stories), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Incluidos — la constitución (Principio X) exige probar las
funciones principales (autenticación, validación de roles, registro y
consulta de clientes) y el plan define `tests/` con Vitest + Supertest.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app** (según plan.md): `backend/src/`, `frontend/src/`, `database/`
- Nombres de carpetas del backend fijados por el documento de sprint:
  `config/`, `routes/`, `controllers/`, `services/`, `models/`,
  `middlewares/`, `validators/`, `utils/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project structure per implementation plan: `frontend/`, `backend/src/` (con `config/`, `routes/`, `controllers/`, `services/`, `models/`, `middlewares/`, `validators/`, `utils/`), `backend/tests/` (`contract/`, `integration/`, `unit/`), `database/` (`migrations/`, `seeds/`, `scripts/`) en la raíz del repositorio, sin carpetas alternativas (`client/`, `server/`, `dataBase/`)
- [X] T002 Initialize `backend/package.json` with `"type": "module"` and dependencies: express, mysql2, jsonwebtoken, bcrypt, dotenv, express-validator; dev dependencies: vitest, supertest (research.md R-01, R-04, R-05, R-10)
- [X] T003 [P] Scaffold `frontend/package.json` with React 18 and Vitest + jsdom + @testing-library/react (research.md R-01)
- [X] T004 [P] Create `.env.example` (raíz y `backend/.env.example`) con variables: credenciales MySQL, `JWT_SECRET`, credenciales del administrador inicial; y actualizar `.gitignore` para excluir `.env` (constitución Principio V; R-11)
- [X] T005 [P] Configure test scripts `npm test` (Vitest) en `backend/package.json` y `frontend/package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**?? CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Create migration `database/migrations/001_initial.sql` con las 5 tablas del Sprint 1 según data-model.md: `usuarios` (`email VARCHAR(150) NOT NULL UNIQUE`, `contrasena_hash VARCHAR(255) NOT NULL`, `rol` ENUM de 4 valores, `estado` ENUM `activo`/`deshabilitado`, `intentos_fallidos`, `bloqueado_hasta`), `clientes`, `tipos_membresia`, `membresias`, `pagos`; motor InnoDB, `utf8mb4`, claves primarias y foráneas, índices de `clientes` (`nombre_completo`, `telefono`, `correo`)
- [X] T007 Create seed `database/seeds/001_admin_inicial.sql` que crea la cuenta administradora desde variables de entorno (research.md R-11)
- [X] T008 [P] Implement database pool and JWT config in `backend/src/config/db.js` (mysql2 con pool y consultas parametrizadas, R-10) y `backend/src/config/jwt.js` (`JWT_SECRET`, expiración 8 h — clarificación Q5)
- [X] T009 [P] Implement centralized error handling in `backend/src/middlewares/error-handler.js`: envolvente `{exito, error:{codigo, mensaje}}`, códigos 400/401/403/404/409/423/500, mensajes sin detalles internos (FR-002; contracts/api.md)
- [X] T010 [P] Implement authentication middleware in `backend/src/middlewares/authentication.js`: valida encabezado `Authorization: Bearer` con JWT (R-06)
- [X] T011 [P] Implement authorization middleware by role in `backend/src/middlewares/authorization.js` con la matriz de permisos de contracts/api.md (FR-003, FR-006)
- [X] T012 Create Express app in `backend/src/app.js` (monta `/api`, middlewares de error) y entry point `backend/src/server.js`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Inicio de sesión y acceso según rol (Priority: P1) ?? MVP

**Goal**: Un usuario registrado inicia sesión con correo y contraseña y solo ve las funciones de su rol; credenciales inválidas dan error claro y 5 fallos bloquean 15 minutos.

**Independent Test**: Login con el admin seed devuelve token y redirige a las funciones de su rol; contraseña mala → 401 genérico; 5 fallos → 423 durante 15 min (quickstart escenarios 1–3, 13).

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T013 [P] [US1] Contract test for `POST /api/auth/login` in `backend/tests/contract/auth.test.js`: 200 con token y datos del usuario, 401 genérico con credenciales malas, 400 con campos faltantes, 423 `CUENTA_BLOQUEADA` al quinto fallo (contracts/api.md)
- [X] T014 [P] [US1] Integration test for sign-in flow and lockout in `backend/tests/integration/login.test.js`: login exitoso → ruta protegida accesible; 5 fallos seguidos → rechazo 15 min y contador limpio tras login correcto (SC-008, FR-002)

### Implementation for User Story 1

- [X] T015 [P] [US1] Create usuario model in `backend/src/models/usuario.model.js`: `findByEmail`, `findById` con campos `id, nombre, email, rol, estado, intentos_fallidos, bloqueado_hasta` y sin exponer `contrasena_hash` (entidad compartida con US2, se crea aquí por ser la historia más temprana)
- [X] T016 [US1] Implement auth service in `backend/src/services/auth.service.js` (depends on T015): compara con bcrypt (≥ costo 10), incrementa `intentos_fallidos`, bloquea 15 min al llegar a 5, limpia al autenticar, emite JWT con expiración 8 h y rechaza usuarios `deshabilitado` (FR-002, FR-012, R-05, R-07)
- [X] T017 [P] [US1] Create login validators in `backend/src/validators/auth.validators.js`: `email` con formato válido y `contraseña` requerida (FR-011)
- [X] T018 [US1] Implement login endpoint in `backend/src/controllers/auth.controller.js` and `backend/src/routes/auth.routes.js` (`POST /api/auth/login` → 200/400/401/423) (depends on T016, T017)
- [X] T019 [P] [US1] Create session context and API client in `frontend/src/context/AuthContext.jsx` y `frontend/src/services/auth.api.js`: guarda token en `localStorage`, envía `Authorization: Bearer` (R-06)
- [X] T020 [US1] Create login page and protected routing in `frontend/src/pages/LoginPage.jsx` y `frontend/src/components/ProtectedRoute.jsx` (depends on T019): muestra error claro sin detalles internos (US1-2), redirige según rol
- [X] T021 [US1] Create role-based navigation menu in `frontend/src/components/PrincipalMenu.jsx` (depends on T020): muestra únicamente las funciones permitidas por el rol (US1-1, US1-4)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently (escenarios quickstart 1, 2, 3, 13)

---

## Phase 4: User Story 2 - Registro y administración de usuarios y roles (Priority: P2)

**Goal**: El administrador registra, consulta y modifica usuarios y les asigna roles; ningún otro rol puede hacerlo.

**Independent Test**: Con sesión de admin se crea un usuario con rol y ese usuario entra con sus permisos; con sesión de recepcionista la gestión de usuarios responde 403 (quickstart escenarios 4–6).

### Tests for User Story 2

- [X] T022 [P] [US2] Contract test for user administration in `backend/tests/contract/usuarios.test.js`: 201 al crear, 400 si la contraseña no cumple "mínimo 8 caracteres, al menos una mayúscula y un número" (Q1), 409 con email duplicado, 403 sin rol administrador, sin endpoints DELETE (FR-014)

### Implementation for User Story 2

- [X] T023 [P] [US2] Implement user service in `backend/src/services/usuario.service.js`: crear con hash de contraseña, `email` único, `rol` de la lista permitida; actualizar nombre/email/rol/estado sin borrado físico (FR-004, FR-005, FR-014, R-12)
- [X] T024 [P] [US2] Create user validators in `backend/src/validators/usuario.validators.js` que citan: contraseña "≥ 8 caracteres, al menos una mayúscula y un número", email formato válido, `rol` ENUM `administrador`/`recepcionista`/`entrenador`/`cliente` (Q1, data-model.md)
- [X] T025 [US2] Implement user endpoints in `backend/src/controllers/usuario.controller.js` and `backend/src/routes/usuario.routes.js`: `GET/POST /api/usuarios`, `GET/PUT /api/usuarios/:id` protegidos por middleware de rol administrador (depends on T023, T024)
- [X] T026 [P] [US2] Create users API client in `frontend/src/services/usuarios.api.js`
- [X] T027 [US2] Create users administration page in `frontend/src/pages/UsuariosPage.jsx` (depends on T026): listar, crear, editar, asignar rol y deshabilitar con confirmación y mensajes de éxito/error (US2-1…US2-5, FR-015)
- [X] T028 [US2] Integrate users entry into navigation for administrator role in `frontend/src/components/PrincipalMenu.jsx` (depends on T021, T027)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Registro y modificación de clientes (Priority: P2)

**Goal**: Administrador y recepcionista crean y actualizan clientes, con aviso de posible duplicado y confirmación explícita.

**Independent Test**: Con sesión de admin o recepcionista se crea y edita un cliente con confirmación visible; repetir con mismo nombre y teléfono/correo lanza el aviso 409; entrenador/cliente reciben 403 (quickstart escenarios 7–8).

### Tests for User Story 3

- [X] T029 [P] [US3] Contract test for client write operations in `backend/tests/contract/clientes-escritura.test.js`: 201 al crear, 400 si falta `nombre_completo` o no hay teléfono ni correo, 409 `POSIBLE_DUPLICADO` con mismo nombre y teléfono o correo y 201 al reenviar con `confirmar_duplicado: true`, 403 para entrenador/cliente (contracts/api.md)

### Implementation for User Story 3

- [X] T030 [P] [US3] Create cliente model in `backend/src/models/cliente.model.js`: `create`, `update`, `findDuplicate` por `nombre_completo` + (`telefono` o `correo`), sin operaciones de borrado (data-model.md, FR-007, FR-014)
- [X] T031 [US3] Implement client service in `backend/src/services/cliente.service.js` (depends on T030): alta y modificación con detección de duplicados y bandera `confirmar_duplicado` (R-08, Q4)
- [X] T032 [P] [US3] Create client validators in `backend/src/validators/cliente.validators.js` que citan: `nombre_completo` obligatorio; "al menos uno de `telefono` o `correo` obligatorio" (data-model.md)
- [X] T033 [US3] Implement client write endpoints in `backend/src/controllers/cliente.controller.js` and `backend/src/routes/cliente.routes.js`: `POST /api/clientes`, `PUT /api/clientes/:id` con middleware de rol administrador/recepcionista (depends on T031, T032)
- [X] T034 [P] [US3] Create clients API client in `frontend/src/services/clientes.api.js`
- [X] T035 [US3] Create client create/edit pages in `frontend/src/pages/ClienteFormPage.jsx` (depends on T034): diálogo de confirmación ante duplicado y mensaje de éxito/error (US3-1…US3-5, FR-015)
- [X] T036 [US3] Integrate client management entries into navigation for administrator and receptionist roles in `frontend/src/components/PrincipalMenu.jsx` (depends on T021, T035)

**Checkpoint**: At this point, User Stories 1, 2 AND 3 should work independently

---

## Phase 6: User Story 4 - Consulta de clientes según el rol (Priority: P3)

**Goal**: Admin, recepcionista y entrenador consultan clientes; el entrenador ve solo nombre y contacto, y puede buscar por nombre o contacto.

**Independent Test**: Con cada rol se consulta la lista y los campos devueltos coinciden con el permiso del rol; un cliente autenticado recibe 403 (quickstart escenario 9).

### Tests for User Story 4

- [X] T037 [P] [US4] Contract test for client queries in `backend/tests/contract/clientes-consulta.test.js`: admin/recepcionista reciben ficha completa, entrenador recibe únicamente `id, nombre_completo, telefono, correo`, `?q=` filtra por nombre o contacto, lista vacía con mensaje claro cuando no hay coincidencias, 403 para rol cliente (FR-009, Q2, US4-4)

### Implementation for User Story 4

- [X] T038 [US4] Extend client service in `backend/src/services/cliente.service.js` with `list(q, rol)` y `getById(id, rol)`: proyección de campos para entrenador y búsqueda por nombre/contacto usando los índices (depends on T031; data-model.md)
- [X] T039 [US4] Implement query endpoints in `backend/src/routes/cliente.routes.js` and `backend/src/controllers/cliente.controller.js`: `GET /api/clientes?q=`, `GET /api/clientes/:id` (depends on T038)
- [X] T040 [US4] Extend `frontend/src/services/clientes.api.js` with list and search calls (depends on T034)
- [X] T041 [US4] Create client list page with search in `frontend/src/pages/ClientesPage.jsx` (depends on T040): tabla con resultados, estados vacíos claros y vista restringida para entrenador
- [X] T042 [US4] Integrate client consultation entries into navigation for administrator, receptionist and trainer roles in `frontend/src/components/PrincipalMenu.jsx` (depends on T021, T041)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: User Story 5 - Consulta de la información propia (Priority: P3)

**Goal**: El cliente solo ve su propia ficha; cualquier intento de ver datos de otros clientes queda denegado sin exponer información ajena.

**Independent Test**: Login como cliente muestra únicamente su ficha; `GET /api/clientes/:id` de otro cliente responde 403 sin datos; sin ficha vinculada responde 404 con mensaje claro (quickstart escenario 10).

### Tests for User Story 5

- [X] T043 [P] [US5] Contract test for self-information in `backend/tests/contract/clientes-propio.test.js`: 200 con la ficha propia vía `GET /api/clientes/mio`, 404 sin ficha vinculada, 403 al consultar `/api/clientes/:id` de terceros (FR-010, US5-1, US5-2)

### Implementation for User Story 5

- [X] T044 [US5] Implement self-information service and endpoint in `backend/src/services/cliente.service.js` and `backend/src/routes/cliente.routes.js`: `GET /api/clientes/mio` resuelta antes que `/api/clientes/:id`, vinculada por `cliente.usuario_id` (depends on T039; data-model.md)
- [X] T045 [US5] Extend `frontend/src/services/clientes.api.js` with self-information call (depends on T040)
- [X] T046 [US5] Create self-information page in `frontend/src/pages/MiInformacionPage.jsx` (depends on T045): muestra solo la ficha del propio cliente
- [X] T047 [US5] Integrate self-information entry into navigation for cliente role in `frontend/src/components/PrincipalMenu.jsx` (depends on T021, T046)

**Checkpoint**: All 5 user stories independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T048 [P] Run full test suites in `backend/` and `frontend/` (`npm test`) and fix any failures (constitución Principio X)
- [X] T049 [P] Security hardening review across `backend/src/` and `backend/tests/`: solo hashes bcrypt en `usuarios` (SC-005), `.env` ignorado y `.env.example` sin secretos, mensajes de error genéricos (SC-006), permisos validados en servidor (SC-004), consultas parametrizadas (FR-013)
- [X] T050 [P] UX polish in `frontend/src/pages/` and `frontend/src/components/`: confirmación en operaciones de modificación, mensajes de éxito/error en todas las operaciones y estados vacíos claros (FR-015, Principio XI)
- [ ] T051 Execute all 14 validation scenarios in [quickstart.md](quickstart.md) and record results (SC-001…SC-008)
- [X] T052 [P] Documentation: update `README.md` (raíz) with setup steps and `database/README.md` with migrations/seeds usage (constitución Principio IV: cambios de BD documentados)
- [X] T053 [P] Final structure audit: carpetas `frontend/`, `backend/`, `database/` sin alternativas, backend 100% ES Modules (`import`/`export`, `"type": "module"`), frontend sin acceso directo a MySQL (restricciones técnicas heredadas del sprint)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
  - US3 → US4 comparten `cliente.service.js`/`clientes.api.js` (secuenciales entre sí)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Reutiliza el modelo `usuario` y el menú de US1, pero es testeable de forma independiente
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Reutiliza el menú de US1, testeable independiente
- **User Story 4 (P3)**: Depende de US3 (usa `cliente.service.js` y `clientes.api.js` creados allí); testeable con datos de prueba propios
- **User Story 5 (P3)**: Depende de US4 (ruta `/mio` se registra antes de `/:id`); testeable independiente con su propio cliente vinculado

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel: T003, T004, T005
- All Foundational tasks marked [P] can run in parallel: T008, T009, T010, T011
- **US1**: T013 + T014 (tests) en paralelo; T015 + T017 (modelo y validadores) en paralelo; T019 en paralelo con T016/T018
- **US2**: T022 (test) + T023 (servicio) + T024 (validadores) + T026 (API cliente) en paralelo
- **US3**: T029 (test) + T030 (modelo) + T032 (validadores) + T034 (API cliente) en paralelo
- **US4**: T037 (test) en paralelo con T038; T040 en paralelo con T038/T039
- **US5**: T043 (test) en paralelo con T044; T045 en paralelo con T044
- **Polish**: T048, T049, T050, T052, T053 en paralelo
- Once Foundational phase completes and con capacidad: US1/US2/US3 pueden avanzar en paralelo con distintos desarrolladores (US4/US5 esperan a US3 por los archivos compartidos)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Contract test for POST /api/auth/login in backend/tests/contract/auth.test.js" (T013)
Task: "Integration test for sign-in flow and lockout in backend/tests/integration/login.test.js" (T014)

# Launch model + validators together (different files):
Task: "Create usuario model in backend/src/models/usuario.model.js" (T015)
Task: "Create login validators in backend/src/validators/auth.validators.js" (T017)

# Frontend session context can be built while backend service is implemented:
Task: "Create session context and API client in frontend/src/context/AuthContext.jsx" (T019)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: quickstart escenarios 1, 2, 3 y 13
5. Demo: login + menú por rol funcionando

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Demo (MVP!)
3. Add User Story 2 → Test independently → Demo (gestión de usuarios)
4. Add User Story 3 → Test independently → Demo (clientes dados de alta)
5. Add User Stories 4 y 5 → Consultas por rol y autoservicio
6. Polish → quickstart completo (14 escenarios)

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. US4 y US5 continúan sobre la base de US3
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
