# Tasks: Membresías, pagos, reconocimiento facial y control de acceso (Sprint 2)

**Input**: Design documents from `/specs/002-sprint2-membresias-pagos-acceso-facial/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Incluidos porque la constitución (Principio X) exige probar las funciones principales antes de considerarlas terminadas, y el patrón del Sprint 1 ya usa Vitest + Supertest en `backend/tests/`.

**Organization**: Las tareas están agrupadas por historia de usuario para permitir implementación y pruebas independientes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Story]**: Historia de usuario a la que pertenece (US1…US9)
- Incluir la ruta exacta del archivo en la descripción

## Path Conventions

- **Web app**: `backend/src/…`, `frontend/src/…`, `database/…` (estructura heredada del Sprint 1)

---

## Phase 1: Setup (Infraestructura compartida)

**Purpose**: Base de datos del Sprint 2, configuración facial y dependencias

- [X] T001 Crear la migración `database/migrations/002_sprint2.sql` con los ALTER de `tipos_membresia` (`descripcion`, `estado`), `membresias` (`precio` con backfill) y `pagos` (`membresia_id` NOT NULL, `metodo` NOT NULL), más el CREATE de `rostros`, `accesos` y `auditoria` con sus FKs e índices según `data-model.md` (InnoDB, `utf8mb4`)
- [X] T002 [P] Crear el seed `database/seeds/002_tipos_membresia.sql` con 3 planes de ejemplo (mensual 30 días, trimestral 90, anual 365) según R-25
- [X] T003 [P] Documentar los cambios de la migración 002 en `database/README.md` (Principio IV: cambios de estructura documentados)
- [X] T004 [P] Agregar `FACIAL_UMBRAL_COINCIDENCIA=0.6` a `.env.example` (raíz y `backend/`) sin secretos y asegurar que `backend/src/config/` lo lee con `dotenv` (R-16)
- [X] T005 [P] Agregar `@vladmandic/face-api` a `frontend/package.json` y colocar los pesos del modelo en `frontend/public/modelos/` (R-13, licencia MIT, sin servicios externos)
- [X] T006 Ejecutar `001_initial.sql` y `002_sprint2.sql` desde cero en MySQL local y verificar tablas, relaciones e índices

**Checkpoint**: Base de datos del Sprint 2 aplicada y configuración facial disponible

---

## Phase 2: Foundational (Prerrequisitos bloqueantes)

**Purpose**: Componentes compartidos por todas las historias

**⚠ CRITICAL**: Ninguna historia de usuario puede iniciar hasta completar esta fase

- [X] T007 Ampliar `backend/src/middlewares/authorization.js` con la matriz de permisos del Sprint 2 definida en `contracts/api.md` (tipos, membresías, pagos, rostros, accesos, auditoría y rutas `/mios`)
- [X] T008 [P] Crear `backend/src/services/auditoria.service.js` con `registrar({ usuarioId, accion, modulo, resultado, descripcion })` sin datos biométricos ni sensibles (R-22, FR-020)
- [X] T009 [P] Crear `backend/src/utils/descriptor.js` para serializar/deserializar 128 `float32` little-endian en exactamente 512 bytes (R-15)
- [X] T010 [P] Ampliar `backend/src/utils/errors.js` y `backend/src/utils/responses.js` con los códigos nuevos del Sprint 2 (`ADEUDO_PENDIENTE`, `MEMBRESIA_ACTIVA_EXISTENTE`, `ESTADO_NO_PERMITE`, `CLIENTE_NO_ACTIVO`, `MEMBRESIA_REQUERIDA`, `DESCRIPTOR_INVALIDO`) según `contracts/api.md`

**Checkpoint**: Fundamento listo; las historias pueden empezar

---

## Phase 3: User Story 1 - Registro y administración de tipos de membresía (Priority: P1) ⭐ MVP

**Goal**: El administrador registra, consulta y modifica los tipos de membresía (nombre, descripción, duración y precio).

**Independent Test**: Dar de alta un tipo válido desde la cuenta administradora, verlo en la lista, modificarlo y comprobar que un rol sin permiso recibe `403`.

### Tests for User Story 1

- [X] T011 [P] [US1] Tests contract de tipos de membresía en `backend/tests/contract/tipos-membresia.test.js` (alta y modificación solo administrador → `403` en otros roles; validación de `duracion_dias > 0` y `precio >= 0`)

### Implementation for User Story 1

- [X] T012 [P] [US1] Crear el modelo `backend/src/models/tipoMembresia.model.js`
- [X] T013 [US1] Crear el validador `backend/src/validators/tipoMembresia.validators.js` (nombre obligatorio; `duracion_dias` > 0; `precio` ≥ 0; rechazar datos faltantes con mensaje claro)
- [X] T014 [US1] Implementar `backend/src/services/tipoMembresia.service.js`: crear, listar y modificar sin alterar las membresías ya asignadas (FR-002), registrando auditoría vía T008 (depende de T008, T012, T013)
- [X] T015 [US1] Crear `backend/src/controllers/tipoMembresia.controller.js` con respuestas de la envolvente heredada
- [X] T016 [US1] Crear `backend/src/routes/tipoMembresia.routes.js` y registrarla en `backend/src/app.js` (depende de T015)
- [X] T017 [P] [US1] Crear `frontend/src/services/tipos-membresia.api.js`
- [X] T018 [US1] Crear `frontend/src/pages/TiposMembresiaPage.jsx` con alta, listado y modificación, más mensajes de éxito y error en español (depende de T017)
- [X] T019 [US1] Registrar la ruta en `frontend/src/App.jsx` y la opción de menú en `frontend/src/components/PrincipalMenu.jsx`, visible solo para administrador

**Checkpoint**: US1 funcional y verificable de forma independiente

---

## Phase 4: User Story 2 - Asignación de membresía (Priority: P1)

**Goal**: Administrador o recepcionista asigna una membresía a un cliente con fechas y estado calculados.

**Independent Test**: Asignar una membresía a un cliente activo y verificar `fecha_vencimiento` calculada, estado `activa` y rechazos (`409`) por membresía activa existente, cliente inactivo o adeudo pendiente.

### Tests for User Story 2

- [X] T020 [P] [US2] Tests contract de asignación en `backend/tests/contract/membresias.test.js` (cliente inactivo → `409 CLIENTE_NO_ACTIVO`; membresía activa existente → `409 MEMBRESIA_ACTIVA_EXISTENTE`; adeudo pendiente → `409 ADEUDO_PENDIENTE`; entrenador/cliente → `403`)

### Implementation for User Story 2

- [X] T021 [P] [US2] Crear el modelo `backend/src/models/membresia.model.js`
- [X] T022 [US2] Crear el validador `backend/src/validators/membresia.validators.js` (`cliente_id`, `tipo_membresia_id` y `fecha_inicio` válidos, según `data-model.md`)
- [X] T023 [US2] Implementar en `backend/src/services/membresia.service.js` la operación asignar: cliente existente y activo (FR-003), tipo en estado `activo`, una sola membresía `activa` por cliente (FR-004), adeudo total del cliente en cero (FR-023 / R-26), `fecha_vencimiento = fecha_inicio + duracion_dias` y estado inicial `activa` (FR-003), con auditoría (depende de T008, T012, T021, T022)
- [X] T024 [US2] Crear `backend/src/controllers/membresia.controller.js` (depende de T023)
- [X] T025 [US2] Crear `backend/src/routes/membresia.routes.js` con `POST /api/membresias` y `GET /api/membresias`, y registrarla en `backend/src/app.js` (depende de T024)
- [X] T026 [P] [US2] Crear `frontend/src/services/membresias.api.js`
- [X] T027 [US2] Crear `frontend/src/pages/MembresiasPage.jsx` para asignar y listar membresías con estado y saldo pendiente (depende de T026)
- [X] T028 [US2] Registrar la ruta en `frontend/src/App.jsx` y la opción de menú en `frontend/src/components/PrincipalMenu.jsx` para administrador y recepcionista
- [X] T029 [US2] Prueba de integración en `backend/tests/integration/membresias.test.js` (cliente → asignación → consulta con fechas correctas)

**Checkpoint**: US2 funcional; ya puede asignarse membresías sin tocar las demás historias

---

## Phase 5: User Story 3 - Registro de pagos (Priority: P1)

**Goal**: Administrador o recepcionista registra pagos asociados a cliente y membresía, conservando el historial.

**Independent Test**: Registrar un pago válido y verificar historial, rechazo de montos inválidos, método distinto de `efectivo` y que no existe operación de borrado.

### Tests for User Story 3

- [X] T030 [P] [US3] Tests contract de pagos en `backend/tests/contract/pagos.test.js` (`monto <= 0` → `400`; `metodo` distinto de `efectivo` → `400`; pago sin membresía válida → `400 MEMBRESIA_REQUERIDA`; no hay `DELETE`/`PUT` de pagos)

### Implementation for User Story 3

- [X] T031 [P] [US3] Crear el modelo `backend/src/models/pago.model.js`
- [X] T032 [US3] Crear el validador `backend/src/validators/pago.validators.js` (`monto > 0`; si llega `metodo` debe ser exactamente `efectivo`, R-18 / clarify 2026-10-14)
- [X] T033 [US3] Implementar `backend/src/services/pago.service.js`: registrar pago con `metodo = 'efectivo'` y `membresia_id` obligatorio (FR-007), historial sin DELETE (FR-008) y cálculo de saldo `GREATEST(0, precio − SUM(monto))` sin saldos negativos (FR-009 / R-19), con auditoría (depende de T008, T031, T032)
- [X] T034 [US3] Crear `backend/src/controllers/pago.controller.js` (depende de T033)
- [X] T035 [US3] Crear `backend/src/routes/pago.routes.js` con `POST /api/pagos` y `GET /api/pagos`, y registrarla en `backend/src/app.js` (depende de T034)
- [X] T036 [P] [US3] Crear `frontend/src/services/pagos.api.js`
- [X] T037 [US3] Crear `frontend/src/pages/PagosPage.jsx` con registro de pago, historial y saldo pendiente de la membresía (depende de T036)
- [X] T038 [US3] Registrar la ruta en `frontend/src/App.jsx` y la opción de menú en `frontend/src/components/PrincipalMenu.jsx` para administrador y recepcionista
- [X] T039 [US3] Prueba de integración en `backend/tests/integration/pagos.test.js` (pago parcial → saldo > 0; pago mayor al saldo → saldo en 0 y pago conservado)

**Checkpoint**: US3 funcional con historial financiero inmutable

---

## Phase 6: User Story 4 - Renovación de membresía (Priority: P2)

**Goal**: Renovar membresías y gestionar sus estados (suspender, cancelar, reactivar) respetando reglas de negocio.

**Independent Test**: Renovar una membresía activa y verificar el nuevo vencimiento; suspender y reactivar comprobando que `fecha_vencimiento` no cambia; intentar renovar una suspendida y recibir `409`.

### Tests for User Story 4

- [X] T040 [P] [US4] Tests contract de estados y renovación en `backend/tests/contract/membresias-estados.test.js` (renovar suspendida → `409 ESTADO_NO_PERMITE`; `PUT /api/membresias/:id/estado` con recepcionista → `403`; adeudo pendiente → `409 ADEUDO_PENDIENTE`)

### Implementation for User Story 4

- [X] T041 [US4] Implementar la renovación en `backend/src/services/membresia.service.js`: aplica a `activa` o `vencida`, suma `duracion_dias` del tipo desde la `fecha_vencimiento` vigente, deja estado `activa` y exige adeudo en cero (FR-005, FR-023, R-21)
- [X] T042 [US4] Implementar en `backend/src/services/membresia.service.js` las transiciones `suspender`, `cancelar` y `reactivar` exclusivas del administrador, donde **reactivar conserva `fecha_vencimiento` sin recuperar días** (R-21 / clarify 2026-10-14), con auditoría (depende de T008, T041)
- [X] T043 [US4] Añadir `POST /api/membresias/:id/renovar` y `PUT /api/membresias/:id/estado` en `backend/src/routes/membresia.routes.js` y `backend/src/controllers/membresia.controller.js` (depende de T042)
- [X] T044 [P] [US4] Ampliar `frontend/src/services/membresias.api.js` con `renovar()` y `cambiarEstado()`
- [X] T045 [US4] Añadir en `frontend/src/pages/MembresiasPage.jsx` las acciones renovar, suspender, cancelar y reactivar con confirmación y mensajes claros (depende de T044)
- [X] T046 [US4] Prueba de integración en `backend/tests/integration/renovacion.test.js` (suspensión → reactivación con `fecha_vencimiento` idéntica)

**Checkpoint**: Ciclo de vida completo de la membresía

---

## Phase 7: User Story 5 - Registro de información facial (Priority: P2)

**Goal**: Capturar y almacenar la información facial de clientes registrados, protegida y sin exponerse.

**Independent Test**: Capturar el rostro de un cliente activo desde la cámara y verificar que quede asociado, que una nueva captura reemplace la anterior y que ninguna respuesta contenga el descriptor.

### Tests for User Story 5

- [X] T047 [P] [US5] Tests contract de rostros en `backend/tests/contract/rostros.test.js` (`descriptor` sin 128 valores → `400 DESCRIPTOR_INVALIDO`; cliente sin ficha → `404`; ninguna respuesta incluye `descriptor_facial`; cliente/entrenador → `403`)

### Implementation for User Story 5

- [X] T048 [P] [US5] Crear el modelo `backend/src/models/rostro.model.js` (UNIQUE en `cliente_id`, `descriptor_facial VARBINARY(512)` según `data-model.md`)
- [X] T049 [US5] Crear el validador `backend/src/validators/rostro.validators.js` (`cliente_id` y `descriptor` como arreglo de exactamente 128 números)
- [X] T050 [US5] Implementar `backend/src/services/rostro.service.js`: registrar o reemplazar en la misma fila (FR-011), excluir siempre el descriptor de las respuestas (FR-017), eliminar el registro cuando el cliente se dé de baja o pase a inactivo (FR-022 / R-27) y registrar auditoría (depende de T008, T009, T048, T049)
- [X] T051 [US5] Crear `backend/src/controllers/rostro.controller.js` y `backend/src/routes/rostro.routes.js` (`POST /api/rostros`, `GET /api/rostros/:cliente_id`) y registrarlas en `backend/src/app.js` (depende de T050)
- [X] T052 [US5] Integrar la eliminación del rostro en la baja de cliente dentro de `backend/src/services/cliente.service.js` (estado `inactivo` ⇒ se borra la fila de `rostros`, FR-022) (depende de T050)
- [X] T053 [P] [US5] Crear `frontend/src/components/camara/useCara.js` con `getUserMedia`, 5 muestras separadas ~300 ms y promedio de descriptores (R-17)
- [X] T054 [P] [US5] Crear `frontend/src/components/camara/CapturaFacial.jsx` (video + canvas) con estados de permiso denegado, cámara no disponible y captura en curso
- [X] T055 [US5] Crear `frontend/src/services/descriptor-facial.js` para cargar el modelo local de `frontend/public/modelos/` y calcular el descriptor promedio (depende de T005, T053)
- [X] T056 [P] [US5] Crear `frontend/src/services/rostros.api.js`
- [X] T057 [US5] Crear `frontend/src/pages/RegistrarRostroPage.jsx` para elegir cliente, capturar y guardar, indicando si ya cuenta con información facial sin exponer datos biométricos (depende de T055, T056)
- [X] T058 [US5] Registrar la ruta en `frontend/src/App.jsx` y la opción de menú en `frontend/src/components/PrincipalMenu.jsx` para administrador y recepcionista

**Checkpoint**: US5 funcional; la información facial queda lista para identificar

---

## Phase 8: User Story 6 - Identificación facial y control de acceso (Priority: P2) ⭐ Flujo central

**Goal**: Identificar al cliente por su rostro, validar su membresía y autorizar o rechazar el acceso registrando cada intento.

**Independent Test**: Capturar un cliente con membresía vigente (autorizado), con membresía vencida/suspendida/cancelada/sin membresía (rechazado con motivo) y con un rostro no registrado (rechazado sin datos de terceros).

### Tests for User Story 6

- [X] T059 [P] [US6] Tests contract de accesos en `backend/tests/contract/accesos.test.js` (autorizado; rechazado por cada motivo cerrado de R-23; `rostro_no_identificado` con `cliente` y `membresia` en `null`; roles sin permiso → `403`)

### Implementation for User Story 6

- [X] T060 [US6] Crear `backend/src/config/facial.js` que lee `FACIAL_UMBRAL_COINCIDENCIA` con valor por defecto `0.6` (R-16) (depende de T004)
- [X] T061 [US6] Crear `backend/src/services/matching.service.js` con la distancia euclidiana entre vectores de 128 dimensiones y regla "coincidencia si distancia ≤ umbral" (R-16) (depende de T060)
- [X] T062 [P] [US6] Crear el modelo `backend/src/models/acceso.model.js` (`cliente_id` NULLable, `motivo_rechazo` obligatorio si `resultado = 'rechazado'`)
- [X] T063 [US6] Implementar `backend/src/services/acceso.service.js`: identificar el rostro **antes** de consultar la membresía (FR-012), validar la vigencia después (FR-013), rechazar con motivo cerrado `membresia_vencida|suspendida|cancelada|sin_membresia|rostro_no_identificado` (R-23), registrar el intento **antes** de responder (FR-015) y auditar (depende de T008, T061, T062)
- [X] T064 [US6] Crear `backend/src/validators/acceso.validators.js` (descriptor presente y válido, o `null` para simular cámara no disponible)
- [X] T065 [US6] Crear `backend/src/controllers/acceso.controller.js` y `backend/src/routes/acceso.routes.js` con `POST /api/accesos/intento`, y registrarlas en `backend/src/app.js` (depende de T063, T064)
- [X] T066 [P] [US6] Crear `frontend/src/services/accesos.api.js` con `enviarIntento(descriptor)`
- [X] T067 [US6] Crear `frontend/src/pages/AccesoPage.jsx` (terminal de acceso con `CapturaFacial`, muestra resultado y motivo en lenguaje claro, sin errores técnicos) (depende de T054, T055, T066)
- [X] T068 [US6] Registrar la ruta en `frontend/src/App.jsx` y la opción de menú en `frontend/src/components/PrincipalMenu.jsx` para administrador y recepcionista
- [X] T069 [US6] Prueba de integración en `backend/tests/integration/acceso.test.js` con descriptores simulados: autorizado, rechazo por cada estado de membresía y rostro no identificado (SC-004, SC-005, SC-006)

**Checkpoint**: Flujo demostrable del sprint (identificación + vigencia + registro)

---

## Phase 9: User Story 7 - Consulta de pagos y adeudos (Priority: P3)

**Goal**: El administrador consulta historial y adeudos; el cliente consulta lo suyo.

**Independent Test**: Registrar pagos para varios clientes y verificar que el administrador ve todos los saldos, el cliente solo los suyos y el entrenador recibe `403`.

### Tests for User Story 7

- [X] T070 [P] [US7] Tests contract de adeudos en `backend/tests/contract/adeudos.test.js` (administrador ve la lista con saldos > 0; cliente solo los propios; entrenador → `403`)

### Implementation for User Story 7

- [X] T071 [US7] Añadir `GET /api/adeudos`, `GET /api/pagos/mios` y `GET /api/adeudos/mios` en `backend/src/routes/pago.routes.js`, `backend/src/controllers/pago.controller.js` y `backend/src/services/pago.service.js` (FR-010) (depende de T033)
- [X] T072 [US7] Añadir la sección de adeudos (saldo por cliente y membresía) en `frontend/src/pages/PagosPage.jsx`
- [X] T073 [US7] Mostrar pagos y adeudos propios del cliente en `frontend/src/pages/MiInformacionPage.jsx` (depende de T071)
- [X] T074 [US7] Registrar la opción de adeudos en `frontend/src/components/PrincipalMenu.jsx` y `frontend/src/App.jsx` solo para administrador

**Checkpoint**: Control financiero completo

---

## Phase 10: User Story 8 - Consulta de registros de acceso (Priority: P3)

**Goal**: Consultar entradas autorizadas y rechazados con filtros.

**Independent Test**: Generar intentos autorizados y rechazados, filtrarlos por fecha y resultado, y verificar que cada rol ve solo lo que le corresponde.

### Tests for User Story 8

- [X] T075 [P] [US8] Tests contract de consulta de accesos en `backend/tests/contract/accesos-consulta.test.js` (filtros `fecha` y `resultado`; entrenador solo campos de asistencia; cliente en `/mios` solo lo propio; lista vacía con mensaje claro)

### Implementation for User Story 8

- [X] T076 [US8] Añadir `GET /api/accesos` con filtros y `GET /api/accesos/mios` en `backend/src/routes/acceso.routes.js`, `backend/src/controllers/acceso.controller.js` y `backend/src/services/acceso.service.js` (HU8) (depende de T063)
- [X] T077 [P] [US8] Ampliar `frontend/src/services/accesos.api.js` con `listar()` y `listarMios()`
- [X] T078 [US8] Crear `frontend/src/pages/AccesosPage.jsx` con tabla, filtros de fecha y resultado, y estado vacío con mensaje claro (depende de T077)
- [X] T079 [US8] Registrar la ruta en `frontend/src/App.jsx` y las opciones de menú en `frontend/src/components/PrincipalMenu.jsx` (administrador, recepcionista y entrenador con vista de asistencia)
- [X] T080 [US8] Mostrar el historial de accesos propio del cliente en `frontend/src/pages/MiInformacionPage.jsx` (depende de T077)

**Checkpoint**: Trazabilidad completa de accesos

---

## Phase 11: User Story 9 - Consulta de la membresía propia por el cliente (Priority: P3)

**Goal**: El cliente consulta en solo lectura el estado y las fechas de su membresía (FR-024).

**Independent Test**: Iniciar sesión como cliente con membresía activa y con membresía vencida, verificando estado y fechas, y comprobando que consultar la membresía de otro cliente devuelve `403`.

### Tests for User Story 9

- [X] T081 [P] [US9] Tests contract de membresía propia en `backend/tests/contract/clientes-mio-membresia.test.js` (`GET /api/clientes/mio/membresia` devuelve los datos del propio cliente; sin membresía → `404`; rol distinto → `403`)

### Implementation for User Story 9

- [X] T082 [US9] Añadir `GET /api/clientes/mio/membresia` en `backend/src/routes/cliente.routes.js` (con precedencia sobre `/api/clientes/:id`), `backend/src/controllers/cliente.controller.js` y `backend/src/services/cliente.service.js`, devolviendo tipo, descripción, fechas y estado (depende de T023)
- [X] T083 [P] [US9] Ampliar `frontend/src/services/clientes.api.js` con `obtenerMiMembresia()`
- [X] T084 [US9] Crear `frontend/src/pages/MiMembresiaPage.jsx` con estado, fecha de inicio, fecha de finalización y tipo de membresía (depende de T083)
- [X] T085 [US9] Registrar la ruta en `frontend/src/App.jsx` y la opción de menú en `frontend/src/components/PrincipalMenu.jsx` visible solo para cliente

**Checkpoint**: Todas las historias funcionando de forma independiente

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras transversales y validación final

- [X] T086 [P] Ejecutar los 34 escenarios de `quickstart.md` y registrar resultados (incluye SC-001, SC-007 y SC-009)
- [X] T087 [P] Revisión de seguridad en `backend/src/`: ningún `descriptor_facial` en respuestas, permisos validados en servidor, `.env` fuera del repositorio y `.env.example` sin secretos (FR-016, FR-017, Principio V)
- [X] T088 [P] Ejecutar las suites completas `cd backend && npm test` y `cd frontend && npm test` y corregir fallos (Principio X)
- [X] T089 Actualizar `gymaccess/README.md` y `database/README.md` con los módulos nuevos del Sprint 2 (Principio I)
- [X] T090 Revisión final: mensajes en español, ES Modules sin `require`/`module.exports`, consultas parametrizadas y sin carpetas alternativas

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — puede iniciar de inmediato
- **Foundational (Phase 2)**: Depende de Setup — **bloquea todas** las historias
- **User Stories (Phase 3–11)**: Todas dependen del Foundational
- **Polish (Phase 12)**: Depende de las historias que se deseen entregar

### User Story Dependencies

- **US1 (P1)**: Tras Foundational — sin dependencias de otras historias
- **US2 (P1)**: Necesita US1 (tipos de membresía) — es el bloque operativo de asignación
- **US3 (P1)**: Necesita US2 (membresía a la que asociar el pago)
- **US4 (P2)**: Necesita US2 (servicio de membresías) — puede ejecutarse en paralelo con US3
- **US5 (P2)**: Necesita Foundational (T008, T009) — independiente de US1–US4
- **US6 (P2)**: Necesita US5 (información facial) y US2 (membresías para validar)
- **US7 (P3)**: Necesita US3 (pagos) — US7-consulta amplía lo que US3 registró
- **US8 (P3)**: Necesita US6 (intentos de acceso registrados)
- **US9 (P3)**: Necesita US2 (membresías) — puede ejecutarse en paralelo con US7/US8

### Within Each User Story

- Tests primero (deben fallar antes de la implementación)
- Modelos → validadores → servicios → controladores → rutas → frontend → menú
- Historia completa antes de pasar a la siguiente prioridad

### Parallel Opportunities

- Fase Setup: T002, T003, T004 y T005 en paralelo (archivos distintos)
- Fase Foundational: T008, T009 y T010 en paralelo
- Dentro de cada historia: el test contract, el modelo y el servicio del frontend son paralelos
- Historias sin relación (US5 ↔ US1/US2/US3 y US9 ↔ US7/US8) pueden avanzar en paralelo con capacidad de equipo

---

## Parallel Example: User Story 5

```text
Tarea: "Tests contract de rostros en backend/tests/contract/rostros.test.js"        (T047)
Tarea: "Crear el modelo backend/src/models/rostro.model.js"                        (T048)
Tarea: "Crear frontend/src/components/camara/useCara.js"                           (T053)
Tarea: "Crear frontend/src/components/camara/CapturaFacial.jsx"                    (T054)
Tarea: "Crear frontend/src/services/rostros.api.js"                                (T056)
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — bloquea todo)
3. Completar Phase 3: US1
4. **PARAR y VALIDAR**: probar la administración de tipos de membresía de forma independiente
5. Demostrar si ya está listo

### Incremental Delivery

1. Setup + Foundational → base lista
2. US1 + US2 + US3 (prioridad P1) → flujo operativo: tipo → membresía → pago ✔ demo
3. US4 → ciclo de vida completo de membresías ✔ demo
4. US5 + US6 (prioridad P2) → reconocimiento facial y control de acceso ✔ demo **(flujo completo del sprint)**
5. US7 + US8 + US9 (prioridad P3) → consultas y reportes operativos ✔ demo final

### Parallel Team Strategy

1. El equipo completa Setup + Foundational
2. Cuando termine el fundamento:
   - Desarrollador A: US1 → US2 → US3 → US4 (línea de membresías y pagos)
   - Desarrollador B: US5 → US6 (línea de reconocimiento facial)
   - Desarrollador C: US7 → US8 → US9 (línea de consultas)
3. Las historias se integran y prueban de forma independiente

---

## Notes

- Las tareas `[P]` usan archivos distintos y no dependen de tareas incompletas
- La etiqueta `[Story]` rastrea la tarea hasta su historia en `spec.md`
- Cada historia debe ser comprobable por separado (ver "Independent Test")
- Commits pequeños y en español según Conventional Commits (`feat(membresias): …`)
- Detenerse en cada checkpoint para validar la historia de forma independiente
