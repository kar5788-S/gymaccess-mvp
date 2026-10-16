# Tasks: Entrenadores, rutinas de entrenamiento y dashboard administrativo (Sprint 3)

**Input**: Design documents from `/specs/003-entrenadores-rutinas-dashboard/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Incluidos porque la constitución (Principio X) exige probar las funciones principales antes de considerarlas terminadas, el quickstart exige cobertura de los servicios nuevos (`Comandos de prueba`) y el patrón de los sprints 1-2 ya usa Vitest + Supertest en `backend/tests/contract/`.

**Organization**: Las tareas están agrupadas por historia de usuario para permitir implementación y pruebas independientes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Story]**: Historia de usuario a la que pertenece (US1…US7)
- Incluir la ruta exacta del archivo en la descripción

## Path Conventions

- **Web app**: `backend/src/…`, `frontend/src/…`, `database/…` (estructura heredada del Sprint 1)

---

## Phase 1: Setup (Infraestructura compartida)

**Purpose**: Base de datos del Sprint 3 y su documentación

- [X] T001 Crear la migración `database/migrations/003_sprint3.sql` con el CREATE de `entrenadores`, `asignaciones_entrenador`, `rutinas`, `ejercicios_rutina`, `objetivos_entrenamiento` y `progresos_clientes`, más la vista `estadisticas_dashboard`, con sus FKs e índices según `data-model.md` (InnoDB, `utf8mb4`, sin ALTER sobre tablas existentes, sin seeds nuevos — R-36)
- [X] T002 [P] Documentar la migración 003 en `database/README.md` (Principio IV: cambios de estructura documentados)
- [X] T003 Ejecutar `001_initial.sql`, `002_sprint2.sql` y `003_sprint3.sql` desde cero en MySQL local y verificar tablas, relaciones, índices y que la vista devuelve los indicadores globales

**Checkpoint**: Base de datos del Sprint 3 aplicada y vista `estadisticas_dashboard` disponible

---

## Phase 2: Foundational (Prerrequisitos bloqueantes)

**Purpose**: Componentes compartidos por todas las historias

**⚠ CRITICAL**: Ninguna historia de usuario puede iniciar hasta completar esta fase

- [X] T004 Ampliar `backend/src/middlewares/authorization.js` con la matriz de permisos del Sprint 3 definida en `contracts/api.md` (entrenadores, asignaciones, rutinas, objetivos, progresos, `/api/clientes/mio/rutina`, `/api/clientes/mio/progreso`, `/api/dashboard` y `/api/dashboard/mio`)
- [X] T005 [P] Ampliar `backend/src/utils/errors.js` y `backend/src/utils/responses.js` con los códigos nuevos del Sprint 3 (`ENTRENADOR_NO_VALIDO`, `USUARIO_YA_ENTRENADOR`, `CLIENTE_SIN_ENTRENADOR`, `FUERA_DE_CARGA`) según `contracts/api.md`
- [X] T006 [P] Crear `backend/src/utils/transaccion.js` con `conTransaccion(callback)` (begin/commit/rollback sobre el pool de `mysql2`, sin exponer detalles internos en errores) para el cierre de asignaciones y el archivado de rutinas (R-29, R-31)

**Checkpoint**: Fundamento listo (matriz, códigos de error y transacciones); las historias pueden empezar

---

## Phase 3: User Story 1 - Registro de entrenadores (Priority: P1) ⭐ MVP

**Goal**: El administrador registra, consulta y modifica perfiles de entrenador vinculados a una cuenta con rol `entrenador`, con baja lógica que conserva el historial.

**Independent Test**: Dar de alta un entrenador con una cuenta válida, verlo en el listado, modificarlo y comprobar que un rol sin permiso recibe `403` y un usuario sin rol entrenador (o deshabilitado) produce `409 ENTRENADOR_NO_VALIDO`.

### Tests for User Story 1

- [X] T007 [P] [US1] Tests contract de entrenadores en `backend/tests/contract/entrenadores.test.js` (alta solo administrador → `403` en recepcionista, entrenador y cliente; usuario sin rol entrenador/deshabilitado → `ENTRENADOR_NO_VALIDO`; usuario ya vinculado → `USUARIO_YA_ENTRENADOR`; `usuario_id` y `nombre` obligatorios con `VALIDACION`)

### Implementation for User Story 1

- [X] T008 [P] [US1] Crear el modelo `backend/src/models/entrenador.model.js` (crear, listar con filtro `estado`, obtener por id, actualizar, `findByUsuarioId` y conteo de asignaciones vigentes; consultas parametrizadas)
- [X] T009 [US1] Crear el validador `backend/src/validators/entrenador.validators.js` (`usuario_id` y `nombre` obligatorios; teléfono y especialidad opcionales; `estado` solo `activo|inactivo`; mensajes de error claros en español)
- [X] T010 [US1] Implementar `backend/src/services/entrenador.service.js`: crear (exige usuario existente con `rol = 'entrenador'` y `estado = 'activo'`, unicidad del vínculo en transacción), listar, obtener y modificar sin borrar asignaciones ni rutinas (FR-001, FR-002, FR-003, FR-025; R-28), registrando auditoría con `auditoria.service.js` (módulo `entrenadores`) (depende de T005, T006, T008)
- [X] T011 [US1] Crear `backend/src/controllers/entrenador.controller.js` con respuestas de la envolvente heredada
- [X] T012 [US1] Crear `backend/src/routes/entrenador.routes.js` y registrarla en `backend/src/app.js` bajo `/api/entrenadores` (la ruta `/mio/clientes` se agrega en US7) (depende de T011)
- [X] T013 [P] [US1] Crear `frontend/src/services/entrenadores.api.js`
- [X] T014 [US1] Crear `frontend/src/pages/EntrenadoresPage.jsx` con alta, listado y modificación (incluye la baja lógica `inactivo`), más mensajes de éxito y error en español (depende de T013)
- [X] T015 [US1] Registrar la ruta en `frontend/src/App.jsx` y la opción en `frontend/src/components/PrincipalMenu.jsx`, visible solo para administrador (el acceso de recepcionista y entrenador se agrega en US7)

**Checkpoint**: US1 funcional y verificable de forma independiente

---

## Phase 4: User Story 2 - Asignación de entrenador a cliente (Priority: P1)

**Goal**: Administrador y recepcionista asignan clientes a entrenadores; una reasignación cierra automáticamente la vigente y conserva el historial completo.

**Independent Test**: Asignar un entrenador y reasignar a otro, comprobando que queda una sola asignación `activa` con `fecha_fin` en la anterior; probar `409 CLIENTE_NO_ACTIVO`, `409 ENTRENADOR_NO_VALIDO` y `403` en roles sin permiso.

### Tests for User Story 2

- [X] T016 [P] [US2] Tests contract de asignaciones en `backend/tests/contract/asignaciones.test.js` (asignación válida solo admin/recepcionista; reasignación cierra la anterior con `fecha_fin` y conserva el historial; cliente inactivo → `CLIENTE_NO_ACTIVO`; entrenador inactivo → `ENTRENADOR_NO_VALIDO`; cerrar una ya cerrada → `ESTADO_NO_PERMITE`; otros roles → `403`)

### Implementation for User Story 2

- [X] T017 [P] [US2] Crear el modelo `backend/src/models/asignacion.model.js` (insertar, listar con filtros `cliente_id`/`entrenador_id`/`estado`, cerrar y buscar la vigente por cliente; consultas parametrizadas)
- [X] T018 [US2] Crear el validador `backend/src/validators/asignacion.validators.js` (`cliente_id` y `entrenador_id` obligatorios; `estado` solo `activa|cerrada`; mensajes claros en español)
- [X] T019 [US2] Implementar `backend/src/services/asignacion.service.js`: asignar cerrando la vigente e insertando la nueva en la misma transacción con `conTransaccion` — un solo registro `activa` por cliente (FR-004, FR-005, FR-006; clarify Q2; R-29) —, listar y cerrar manualmente, validando cliente activo y entrenador activo, con auditoría (`asignaciones`) (depende de T006, T008, T017)
- [X] T020 [US2] Crear `backend/src/controllers/asignacion.controller.js`
- [X] T021 [US2] Crear `backend/src/routes/asignacion.routes.js` y registrarla en `backend/src/app.js` bajo `/api/asignaciones` (depende de T020)
- [X] T022 [P] [US2] Crear `frontend/src/services/asignaciones.api.js`
- [X] T023 [US2] Crear `frontend/src/pages/AsignacionesPage.jsx` con el formulario de asignación, el listado de vigencias (activas y cerradas con sus fechas) y mensajes claros (depende de T022)
- [X] T024 [US2] Registrar la ruta en `frontend/src/App.jsx` y la opción en `frontend/src/components/PrincipalMenu.jsx`, visible para administrador y recepcionista

**Checkpoint**: US2 funcional: una sola asignación activa por cliente con historial conservado

---

## Phase 5: User Story 3 - Creación de rutinas de entrenamiento (Priority: P1) ⭐ Flujo central

**Goal**: El entrenador crea, modifica y archiva rutinas con ejercicios para los clientes de su carga; la nueva rutina archiva automáticamente la vigente del cliente.

**Independent Test**: Crear dos rutinas para el mismo cliente y ver solo la nueva `activa` con la anterior `archivada`; probar `403 FUERA_DE_CARGA` con otro entrenador, `409 CLIENTE_SIN_ENTRENADOR`, las validaciones de ejercicios y la lectura/edición según rol.

### Tests for User Story 3

- [X] T025 [P] [US3] Tests contract de rutinas en `backend/tests/contract/rutinas.test.js` (crear con ejercicios → `201` y la anterior queda `archivada`; cliente sin entrenador → `CLIENTE_SIN_ENTRENADOR`; cliente de otra carga → `FUERA_DE_CARGA`; sin nombre, sin ejercicios o `series: 0` → `VALIDACION`; recepcionista lee `200` pero edita `403`; reactivar sin ejercicios → `400`)

### Implementation for User Story 3

- [X] T026 [P] [US3] Crear el modelo `backend/src/models/rutina.model.js` con las rutinas y sus `ejercicios_rutina` (crear, listar con filtros, obtener con ejercicios por `orden`, actualizar, cambiar estado y archivar la vigente; consultas parametrizadas)
- [X] T027 [US3] Crear el validador `backend/src/validators/rutina.validators.js` (`nombre` obligatorio; `ejercicios` con al menos un elemento; cada ejercicio con `nombre` y al menos `series`/`repeticiones` enteros mayores que cero o `instrucciones` no vacía — FR-009, cita textual del spec)
- [X] T028 [US3] Implementar `backend/src/services/rutina.service.js`: crear (deriva `entrenador_id` del responsable vigente; `409 CLIENTE_SIN_ENTRENADOR`; `403 FUERA_DE_CARGA` fuera de carga; archiva la activa anterior en transacción), listar/obtener con pertenencia, modificar con reemplazo atómico de ejercicios y cambiar estado (reactivar exige ≥ 1 ejercicio y archiva la vigente) — FR-008, FR-009, FR-010, clarify Q3, R-30, R-31 —, con auditoría (`rutinas`) (depende de T006, T008, T017)
- [X] T029 [US3] Crear `backend/src/controllers/rutina.controller.js`
- [X] T030 [US3] Crear `backend/src/routes/rutina.routes.js` y registrarla en `backend/src/app.js` bajo `/api/rutinas` (depende de T029)
- [X] T031 [P] [US3] Crear `frontend/src/services/rutinas.api.js`
- [X] T032 [US3] Crear `frontend/src/pages/RutinasPage.jsx` con listado, creación y edición de rutinas con ejercicios ordenados, archivar/reactivar y mensajes en español (depende de T031)
- [X] T033 [US3] Registrar la ruta en `frontend/src/App.jsx` y la opción en `frontend/src/components/PrincipalMenu.jsx` (administrador y entrenador con edición; recepcionista en modo solo lectura)

**Checkpoint**: US3 funcional: una sola rutina activa por cliente y pertenencia a la carga verificada

---

## Phase 6: User Story 4 - Registro de objetivos y progresos (Priority: P2)

**Goal**: Entrenador y administrador registran objetivos y progresos del cliente con historial conservado; modificar un objetivo no altera sus progresos.

**Independent Test**: Registrar un objetivo y dos progresos con fechas distintas, modificar el objetivo y verificar los progresos intactos; probar progreso sin datos de medición (`400`) y denegaciones a cliente y recepcionista (`403`).

### Tests for User Story 4

- [X] T034 [P] [US4] Tests contract de objetivos y progresos en `backend/tests/contract/objetivos-progresos.test.js` (alta solo entrenador/admin; `FUERA_DE_CARGA` en cliente ajeno; progreso solo con `fecha` → `VALIDACION`; modificar objetivo conserva los progresos; cliente y recepcionista → `403`)

### Implementation for User Story 4

- [X] T035 [P] [US4] Crear el modelo `backend/src/models/objetivo.model.js` (crear, listar por cliente/estado, modificar y obtener por id)
- [X] T036 [P] [US4] Crear el modelo `backend/src/models/progreso.model.js` (crear, listar por cliente/objetivo ordenado por `fecha` ascendente, con `desde`/`hasta`, y modificar)
- [X] T037 [US4] Crear el validador `backend/src/validators/objetivo.validators.js` (`descripcion` obligatoria; `fecha_limite` legible; `estado` solo `en curso|cumplido`)
- [X] T038 [US4] Crear el validador `backend/src/validators/progreso.validators.js` (`fecha` legible y al menos un dato de medición entre `peso`, `medidas`, `marca` o `comentario` — HU4 esc.6, FR-022)
- [X] T039 [US4] Implementar `backend/src/services/objetivo.service.js`: crear, listar, modificar y cumplir sin alterar ni eliminar progresos (FR-011, FR-013; R-32), con pertenencia a la carga y auditoría (`objetivos`) (depende de T017, T035)
- [X] T040 [US4] Implementar `backend/src/services/progreso.service.js`: registrar, listar como historial y modificar sin borrado (FR-012, FR-025; R-32), con pertenencia a la carga y auditoría (`progresos`) (depende de T017, T036)
- [X] T041 [US4] Crear `backend/src/controllers/objetivo.controller.js` y `backend/src/controllers/progreso.controller.js`
- [X] T042 [US4] Crear `backend/src/routes/objetivo.routes.js` y `backend/src/routes/progreso.routes.js` y registrar ambas en `backend/src/app.js` bajo `/api/objetivos` y `/api/progresos` (depende de T041)
- [X] T043 [P] [US4] Crear `frontend/src/services/seguimiento.api.js`
- [X] T044 [US4] Crear `frontend/src/pages/SeguimientoPage.jsx` con objetivos (`en curso`/`cumplido`), registro de progresos y su tabla ordenada por fecha (depende de T043)
- [X] T045 [US4] Registrar la ruta en `frontend/src/App.jsx` y la opción en `frontend/src/components/PrincipalMenu.jsx`, visible solo para administrador y entrenador

**Checkpoint**: US4 funcional: objetivos y progresos con historial sin borrado

---

## Phase 7: User Story 5 - Consulta de rutina y progreso por el cliente (Priority: P2)

**Goal**: El cliente consulta en modo solo lectura su rutina activa y su evolución de objetivos y progresos, nunca la información de terceros.

**Independent Test**: Con sesión de cliente, abrir su plan y su historial; sin rutina activa aparece un mensaje claro con `rutina: null`; cualquier otro rol o dato ajeno responde `403`.

### Tests for User Story 5

- [X] T046 [P] [US5] Tests contract de las consultas propias del cliente en `backend/tests/contract/clientes-mio-rutina.test.js` (`GET /api/clientes/mio/rutina` devuelve la activa con ejercicios; sin activa → `200` con `rutina: null` y mensaje claro; `GET /api/clientes/mio/progreso` devuelve solo objetivos y progresos propios; otros roles → `403`; nunca datos de otro cliente)

### Implementation for User Story 5

- [X] T047 [US5] Ampliar `backend/src/services/cliente.service.js` con `obtenerMiRutina` y `obtenerMiProgreso` resolviendo el `cliente_id` desde `req.usuario.id` (patrón `/mios` heredado; FR-014, FR-015; clarify Q4) (depende de T026, T035, T036)
- [X] T048 [US5] Ampliar `backend/src/controllers/cliente.controller.js` con los nuevos manejadores (depende de T047)
- [X] T049 [US5] Ampliar `backend/src/routes/cliente.routes.js` con `GET /mio/rutina` y `GET /mio/progreso`, con precedencia sobre `:id` (depende de T048)
- [X] T050 [P] [US5] Ampliar `frontend/src/services/clientes.api.js` con `obtenerMiRutina` y `obtenerMiProgreso`
- [X] T051 [US5] Crear `frontend/src/pages/MiRutinaPage.jsx` con su plan vigente, sus objetivos y su evolución, y estado vacío con mensaje claro cuando no hay rutina activa (depende de T050)
- [X] T052 [US5] Registrar la ruta en `frontend/src/App.jsx` y la opción en `frontend/src/components/PrincipalMenu.jsx`, visible solo para cliente

**Checkpoint**: US5 funcional: el cliente solo ve lo suyo en modo solo lectura

---

## Phase 8: User Story 6 - Dashboard administrativo (Priority: P3)

**Goal**: El administrador consulta el dashboard con indicadores por periodo y el entrenador su panel reducido de la carga, sin cifras financieras.

**Independent Test**: Abrir el dashboard como administrador cambiando el periodo (mes / 30 días / histórico); como entrenador ver solo los indicadores de su carga sin importes; recepcionista o cliente → `403`.

### Tests for User Story 6

- [X] T053 [P] [US6] Tests contract del dashboard en `backend/tests/contract/dashboard.test.js` (`GET /api/dashboard` solo administrador → `403` a los demás; `GET /api/dashboard/mio` solo entrenador y sin indicadores financieros; `periodo` por defecto `mes` y valor desconocido → `400`; instalación vacía → indicadores en cero sin errores)

### Implementation for User Story 6

- [X] T054 [P] [US6] Crear el modelo `backend/src/models/dashboard.model.js` con los agregados parametrizados por periodo (`COUNT`/`SUM` sobre `clientes`, `membresias`, `pagos`, `accesos`, `asignaciones_entrenador`, `rutinas` y `progresos_clientes`) y la lectura de la vista `estadisticas_dashboard` (FR-016, FR-017; R-33)
- [X] T055 [US6] Crear el validador `backend/src/validators/dashboard.validators.js` (`periodo` solo `mes|30d|historico`, por defecto `mes`; mensaje claro ante valor desconocido)
- [X] T056 [US6] Implementar `backend/src/services/dashboard.service.js`: indicadores completos para el administrador y panel de la carga del entrenador resolviendo su perfil desde la sesión, **sin cifras financieras** (clarify Q1 respuesta B; FR-018, FR-019)
- [X] T057 [US6] Crear `backend/src/controllers/dashboard.controller.js`
- [X] T058 [US6] Crear `backend/src/routes/dashboard.routes.js` con `GET /api/dashboard` y `GET /api/dashboard/mio` (precedencia sobre `:id`) y registrarla en `backend/src/app.js` (depende de T057)
- [X] T059 [P] [US6] Crear `frontend/src/services/dashboard.api.js`
- [X] T060 [US6] Crear `frontend/src/pages/DashboardPage.jsx` con selector de periodo, tarjetas de indicadores del administrador, panel reducido del entrenador, estado vacío y mensajes en español (depende de T059)
- [X] T061 [US6] Registrar la ruta en `frontend/src/App.jsx` y la opción en `frontend/src/components/PrincipalMenu.jsx` (administrador con el panel completo; entrenador solo con su panel)

**Checkpoint**: US6 funcional: dashboard por rol con periodo y panel del entrenador

---

## Phase 9: User Story 7 - Consulta del personal asignado (Priority: P3)

**Goal**: Administrador y recepcionista consultan el personal con sus clientes asignados; el entrenador consulta únicamente su propia carga.

**Independent Test**: Ver el listado con el conteo de carga y la ficha del entrenador con sus clientes vigentes; como entrenador, `/api/entrenadores/mio/clientes` devuelve solo su carga (o lista vacía sin error); cliente → `403`.

### Tests for User Story 7

- [X] T062 [P] [US7] Tests contract del personal en `backend/tests/contract/personal.test.js` (`GET /api/entrenadores` con `clientes_asignados` para admin/recepcionista → `403` a entrenador y cliente; `GET /api/entrenadores/:id` con clientes vigentes; `GET /api/entrenadores/mio/clientes` solo entrenador, con estados de membresía y sin importes; sin carga → lista vacía)

### Implementation for User Story 7

- [X] T063 [US7] Ampliar `backend/src/services/entrenador.service.js` con el listado enriquecido (`clientes_asignados` y filtro `?estado=`), la ficha con clientes vigentes y `obtenerCargaPropia(usuarioId)` para `/mio/clientes` (FR-007; HU7; sin información financiera) (depende de T017)
- [X] T064 [US7] Ampliar `backend/src/controllers/entrenador.controller.js` y `backend/src/routes/entrenador.routes.js` con `GET /api/entrenadores/:id` y `GET /api/entrenadores/mio/clientes` (precedencia sobre `:id`) (depende de T063)
- [X] T065 [P] [US7] Ampliar `frontend/src/services/entrenadores.api.js` con `listarConCarga`, `obtenerConClientes` y `obtenerMiCarga`
- [X] T066 [US7] Ampliar `frontend/src/pages/EntrenadoresPage.jsx` con la columna de clientes asignados, la ficha con su carga y la vista propia del entrenador con estado vacío "carga 0" (depende de T065)
- [X] T067 [US7] Ampliar `frontend/src/App.jsx` y `frontend/src/components/PrincipalMenu.jsx` para que el recepcionista consulte el personal en solo lectura y el entrenador abra su carga; el cliente queda sin acceso visible (depende de T066)

**Checkpoint**: US7 funcional: personal con conteo de carga y vista propia del entrenador

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras transversales y validación final

- [X] T068 [P] Ejecutar los 36 escenarios de `quickstart.md` y registrar resultados (incluye SC-001, SC-002, SC-006, SC-008 y SC-010)
- [X] T069 [P] Crear `backend/scripts/verificar-quickstart-sprint3.mjs` (patrón del script del Sprint 2, que se conserva) para automatizar los escenarios automatizables del Sprint 3 y ejecutarlo contra la BD temporal `gymaccess_quickstart` con migraciones 001→002→003
- [X] T070 [P] Revisión de seguridad en `backend/src/`: permisos en servidor (matriz + pertenencia a la carga), sin `DELETE` en los endpoints nuevos, sin cifras financieras en respuestas del entrenador, mensajes sin detalle interno (FR-018, FR-019, FR-021, Principios V y VI)
- [X] T071 [P] Ejecutar las suites completas `cd backend && npm test` y `cd frontend && npm test` y corregir fallos (Principio X)
- [X] T072 [P] Ampliar las pruebas de frontend con un smoke test de las páginas nuevas en `frontend/src/pages/` (patrón de `LoginPage.test.jsx`)
- [X] T073 Actualizar `gymaccess/README.md` y `database/README.md` con los módulos nuevos del Sprint 3 (Principio I)
- [X] T074 Documentar en `docs/project-context.md` y `docs/reglas.md` (raíz del proyecto, fuera de `gymaccess/`) el alcance autorizado del Sprint 3: tercera etapa de la base de datos y permisos de escritura del entrenador; dejar preparada la nota para que el equipo ratifique el cambio en la constitución (`.specify/memory/constitution.md`) — no modificar principios sin aprobación (supuesto del spec, Principio I y Gobernanza)
- [X] T075 Revisión final: mensajes en español, ES Modules sin `require`/`module.exports`, consultas parametrizadas y sin carpetas alternativas

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — puede iniciar de inmediato
- **Foundational (Phase 2)**: Depende de Setup — **bloquea todas** las historias
- **User Stories (Phase 3–9)**: Todas dependen del Foundational
- **Polish (Phase 10)**: Depende de las historias que se deseen entregar

### User Story Dependencies

- **US1 (P1)**: Tras Foundational — sin dependencias de otras historias
- **US2 (P1)**: Necesita US1 (perfil de entrenador para validar `entrenador_id`)
- **US3 (P1)**: Necesita US1 (perfil) y US2 (la asignación vigente define al responsable de la rutina)
- **US4 (P2)**: Necesita US1 y US2 (pertencia a la carga del entrenador) — independiente de US3
- **US5 (P2)**: Necesita US3 (rutina activa con ejercicios) y US4 (objetivos y progresos que expone)
- **US6 (P3)**: Necesita US1–US5 (agrega indicadores sobre sus datos); el panel propio usa US2, US3 y US4
- **US7 (P3)**: Necesita US1 (perfiles) y US2 (conteo de asignaciones vigentes) — puede avanzar en paralelo con US3–US6

### Within Each User Story

- Tests primero (deben fallar antes de la implementación)
- Modelos → validadores → servicios → controladores → rutas → frontend → menú
- Historia completa antes de pasar a la siguiente prioridad

### Parallel Opportunities

- Fase Setup: T002 en paralelo (documentación)
- Fase Foundational: T005 y T006 en paralelo
- Dentro de cada historia: el test contract, el modelo backend y el servicio del frontend son paralelos (por ejemplo T034, T035, T036 y T043 en US4)
- Historias sin relación (US7 ↔ US4/US5/US6) pueden avanzar en paralelo con capacidad de equipo

---

## Parallel Example: User Story 4

```text
Tarea: "Tests contract de objetivos y progresos en backend/tests/contract/objetivos-progresos.test.js"   (T034)
Tarea: "Crear el modelo backend/src/models/objetivo.model.js"                                           (T035)
Tarea: "Crear el modelo backend/src/models/progreso.model.js"                                           (T036)
Tarea: "Crear frontend/src/services/seguimiento.api.js"                                                 (T043)
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — bloquea todo)
3. Completar Phase 3: US1
4. **PARAR y VALIDAR**: probar el registro de entrenadores de forma independiente
5. Demostrar si ya está listo

### Incremental Delivery

1. Setup + Foundational → base lista
2. US1 + US2 + US3 (prioridad P1) → flujo operativo: entrenador → asignación → rutina ✔ demo **(flujo central del sprint)**
3. US4 (P2) → objetivos y progresos con historial ✔ demo
4. US5 (P2) → el cliente consulta su plan y su evolución ✔ demo
5. US6 + US7 (P3) → dashboard por rol y personal asignado ✔ demo final

### Parallel Team Strategy

1. El equipo completa Setup + Foundational
2. Cuando termine el fundamento:
   - Desarrollador A: US1 → US2 → US3 (línea de entrenadores, asignaciones y rutinas)
   - Desarrollador B: (tras US2) US4 → US5 (línea de seguimiento)
   - Desarrollador C: (tras US2) US7 → US6 (línea de personal y dashboard)
3. Las historias se integran y prueban de forma independiente

---

## Notes

- Las tareas `[P]` usan archivos distintos y no dependen de tareas incompletas
- La etiqueta `[Story]` rastrea la tarea hasta su historia en `spec.md`
- Cada historia debe ser comprobable por separado (ver "Independent Test")
- Commits pequeños y en español según Conventional Commits (`feat(entrenadores): …`)
- Ningún endpoint nuevo acepta `DELETE`: los estados `inactivo`, `cerrada` y `archivada` conservan el historial (FR-010, FR-025)
