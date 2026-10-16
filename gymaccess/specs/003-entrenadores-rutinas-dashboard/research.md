# Phase 0: Research — Entrenadores, rutinas de entrenamiento y dashboard administrativo (Sprint 3)

**Date**: 2026-10-15 | **Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

Resolución de los unknowns del Technical Context del Sprint 3 y de las
decisiones pendientes del insumo (`docs/sprints/sprint-3.md`, secciones 5 y 6)
aplicables a este alcance. Las decisiones R-01…R-12 del Sprint 1 y R-13…R-27
del Sprint 2 se heredan sin cambios (ver `specs/001-sprint1-auth-clientes/research.md`
y `specs/002-sprint2-membresias-pagos-acceso-facial/research.md`). El
Technical Context de este sprint **no contiene NEEDS CLARIFICATION**: el stack
está fijado por la constitución (Principio III) y reutiliza la arquitectura ya
construida. Formato: Decisión / Rationale / Alternatives considered.

## R-28: Relación entre el perfil de entrenador y el usuario del sistema

- **Decision**: tabla propia `entrenadores` con `usuario_id` UNIQUE →
  `usuarios.id` (FK `RESTRICT`). El alta exige un usuario existente con
  `rol = 'entrenador'` y `estado = 'activo'`, validado en el servidor; el
  perfil guarda su propio `nombre`, `telefono`, `especialidad` y `estado`
  (`activo`/`inactivo`), de modo que se puede retirar a un entrenador sin tocar
  la cuenta de usuario.
- **Rationale**: la regla del insumo ("un entrenador debe estar asociado a un
  usuario del sistema válido") y el FR-001/FR-002 se cumplen con una
  validación explícita en el servicio; la unicidad de `usuario_id` evita
  perfiles duplicados por cuenta (no hay índice único parcial en MySQL, por lo
  que la comprobación se completa con un SELECT en la misma transacción que el
  alta, igual que "una membresía activa por cliente" (FR-004 del Sprint 2));
  tener estado propio permite la baja funcional sin perder el vínculo
  histórico (FR-025).
- **Alternatives considered**: añadir columnas de entrenador a `usuarios`
  (mezcla perfiles de los cuatro roles en una tabla y rompe la separación de
  entidades, Principio II); tabla intermedia `usuarios_entrenadores` (relación
  1:1 innecesariamente compleja); derivar el perfil solo del rol sin fila
  propia (no permite teléfono, especialidad ni estado de baja).

## R-29: Modelo de asignaciones de entrenador y unicidad del responsable vigente

- **Decision**: tabla `asignaciones_entrenador` con `fecha_inicio DATE NOT
  NULL`, `fecha_fin DATE NULL` y `estado ENUM('activa','cerrada')`; un solo
  registro `activa` por cliente. Asignar un entrenador nuevo ejecuta en una
  transacción: cerrar la vigente (`fecha_fin = hoy`, `estado = 'cerrada'`) e
  insertar la nueva. El cierre manual también pone `fecha_fin` y pasa a
  `cerrada`; una asignación cerrada no se reabre (se crea otra).
- **Rationale**: el spec (clarify 2026-10-15, respuesta A) exige cierre
  automático de la anterior con conservación del historial y "un solo
  entrenador principal activo por cliente"; la transacción garantiza la
  unicidad ante concurrencia sin necesidad de índice único parcial; `estado`
  explícito hace legibles las consultas (`?estado=activa`) y evita inferir
  vigencia solo con `fecha_fin IS NULL` en cada filtro.
- **Alternatives considered**: columna `entrenador_id` en `clientes` (pierde
  el historial de reasignaciones, prohibido por el spec); varios entrenadores
  activos por cliente (rechazado en `/speckit.clarify` Q2); cerrar la anterior
  en un paso posterior aparte (dos llamadas sin atomicidad: el cliente quedaría
  momentáneamente con dos responsables); tabla `cierre` separada (complejidad
  sin necesidad).

## R-30: Almacenamiento de los ejercicios de una rutina

- **Decision**: tabla normalizada `ejercicios_rutina` con una fila por
  ejercicio: `rutina_id` FK, `nombre`, `series INT NULL`, `repeticiones INT
  NULL`, `instrucciones TEXT NULL` y `orden INT`. La validación exige nombre y
  al menos `series`/`repeticiones` (> 0) o `instrucciones` no vacía (FR-009).
- **Rationale**: permite consultar, ordenar y validar cada ejercicio con
  condiciones de columna (el spec exige enteros mayores que cero "cuando
  apliquen"), muestra el plan en tabla y facilita reemplazar la lista completa
  de forma atómica en la edición (`PUT /api/rutinas/:id`); separar `rutinas`
  de sus ejercicios mantiene el historial por fila (FR-010/FR-025).
- **Alternatives considered**: columna JSON en `rutinas` (imposible de
  validar por columna, difícil de ordenar y de consultar en SQL); columnas
  fijas `ejercicio_1…N` (máximo artificial y datos dispersos); un campo de
  texto libre con la rutina completa (no consultable ni comprobable, y el
  insumo pide tabla `ejercicios_rutina`).

## R-31: Estados de rutina y regla de "una rutina activa por cliente"

- **Decision**: `rutinas.estado ENUM('activa','archivada')`. Crear una rutina
  nueva archiva automáticamente la vigente del cliente en la misma transacción
  (clarify 2026-10-15, respuesta A); `PUT /api/rutinas/:id/estado` permite
  archivar manualmente o reactivar una archivada (al reactivar se archiva la
  vigente, misma regla). No existe `DELETE`: las rutinas y sus ejercicios solo
  cambian de estado (FR-010).
- **Rationale**: el cliente siempre ve un único plan vigente (`GET
  /api/clientes/mio/rutina`), el patrón "una vigencia activa" ya se usa en
  membresías (FR-004) y asignaciones (R-29), y archivar conserva el historial
  para comparar evolución (insumo, sección 5). Reactivar exige que la rutina
  tenga al menos un ejercicio (FR-009), por lo que la validación se repite en
  el cambio de estado.
- **Alternatives considered**: varias rutinas activas a la vez (rechazado en
  `/speckit.clarify` Q3: el cliente vería planes contradictorios); versionado
  numérico sin estados (más complejo y sin distinción visible para el
  usuario); borrado de la rutina anterior (viola FR-010/FR-025).

## R-32: Objetivos y progresos como historial conservado

- **Decision**: dos tablas. `objetivos_entrenamiento` (`cliente_id`,
  `descripcion`, `meta VARCHAR(255) NULL`, `fecha_limite DATE NULL`, `estado
  ENUM('en curso','cumplido')`) y `progresos_clientes` (`cliente_id`,
  `objetivo_id` FK NULL con `SET NULL`, `fecha DATE`, `peso DECIMAL(5,2) NULL`,
  `medidas VARCHAR(255) NULL`, `marca VARCHAR(255) NULL`, `comentario
  VARCHAR(255) NULL`). Un progreso exige al menos un dato de medición
  (HU4 esc.6); crear, modificar y consultar están permitidos y auditados;
  **el borrado no existe** (FR-011/FR-012/FR-013/FR-025).
- **Rationale**: separar metas de avances permite listar la evolución en orden
  de fecha y responder "objetivos cumplidos vs. en curso" al dashboard;
  `objetivo_id` opcional admite progreso general sin meta; la regla de
  "modificar un objetivo no altera progresos" (FR-013) se cumple porque las
  filas son independientes y las FK usan `SET NULL`; los cuatro datos del
  insumo (peso, medidas, marcas, comentarios) caben como columnas opcionales
  sin JSON.
- **Alternatives considered**: una sola tabla de "seguimiento" con objetivos y
  progresos en filas de tipos distintos (consultas condicionales y estados
  incompatibles); campos de progreso dentro de `objetivos_entrenamiento`
  (impediría varios avances por meta y progreso sin meta); guardar todo en
  `notas` de `clientes` (no histórico, no consultable); borrar progresos al
  cumplir la meta (viola la conservación de historial).

## R-33: Cálculo del dashboard: vista consolidada + agregados parametrizados

- **Decision**: la tabla `estadisticas_dashboard` del insumo se implementa
  como **vista SQL de solo lectura** con los indicadores globales del momento
  (conteos de clientes, membresías, entrenadores, asignaciones vigentes,
  rutinas activas y objetivos). Los indicadores con periodo (ingresos, pagos,
  accesos, progresos recientes) se calculan en `dashboard.service` con
  consultas parametrizadas `COUNT`/`SUM` sobre las tablas existentes, con
  parámetro `periodo` (`mes` por defecto, `30d`, `historico`). Dos endpoints:
  `GET /api/dashboard` (administrador, completo) y `GET /api/dashboard/mio`
  (entrenador, filtrado por su `entrenador_id` y **sin cifras financieras**).
- **Rationale**: el insumo dice textualmente "sin requerir almacenamiento
  adicional complejo más allá de vistas o consultas consolidadas"; una vista
  nunca queda obsoleta porque no almacena datos propios; los agregados viven
  en el backend donde se aplican permisos (Principio II y V) y el frontend
  solo recibe cifras ya autorizadas para el rol (clarify 2026-10-15, respuesta
  B: administrador completo, panel del entrenador sobre su carga, resto 403).
- **Alternatives considered**: tabla materializada con cron (queda obsoleta
  sin proceso de refresco y es complejidad que el insumo descarta); calcular
  en el frontend sobre listas completas (viola Principio II y expondría datos
  crudos a roles sin permiso); librerías de BI o WebSocket (dependencias
  innecesarias para una sede con decenas de usuarios); un endpoint único
  diferenciando en el cliente (la denegación debe ocurrir en el servidor,
  FR-018).

## R-34: Extensión de la matriz de permisos y verificación de carga (ownership)

- **Decision**: las claves nuevas se agregan a `MATRIZ_PERMISOS`
  (`backend/src/middlewares/authorization.js`) siguiendo el patrón heredado
  `autorizar(...rolesPermitidos('…'))`; el rol decide el acceso al endpoint y,
  **adicionalmente, el servicio verifica la pertenencia**: un entrenador solo
  opera recursos de los clientes de su carga (se resuelve su perfil con
  `entrenadores.usuario_id = req.usuario.id`, patrón de las rutas `/mios` del
  Sprint 2) y fuera de ella responde `403 FUERA_DE_CARGA`. El cliente solo
  alcanza sus propios recursos (`/api/clientes/mio/rutina` y
  `/api/clientes/mio/progreso`), resolviendo su `cliente_id` desde la sesión.
- **Rationale**: la matriz sola solo cubre rol→endpoint; la HU3 exige además
  "solo los clientes de su carga", regla que depende del recurso y no del rol,
  por lo que vive en el servicio (FR-008/FR-021); reutilizar el middleware y
  las rutas `/mios` evita lógica nueva de sesión y mantiene una única fuente
  de verdad de permisos (T007 del Sprint 2).
- **Alternatives considered**: ownership solo por rol (permitiría rutinas para
  clientes ajenos, incumple SC-004); middleware genérico de recursos (más
  abstracción de la que necesita un solo rol con carga); políticas externas o
  librerías de autorización (dependencia nueva innecesaria); resolver el
  cliente desde un parámetro del body (habilitaría consultar datos ajenos si
  se manipula, como ya se probó en HU5 esc.4).

## R-35: Auditoría de los módulos nuevos

- **Decision**: reutilizar la tabla `auditoria` (sin cambios de esquema) con
  `modulo` ∈ `entrenadores`, `asignaciones`, `rutinas`, `objetivos`,
  `progresos` (todas dentro del `VARCHAR(30)`) y `accion` (`crear`,
  `modificar`, `cerrar`, `cambiar_estado`). Se registran: alta y modificación
  de entrenadores, creación y cierre de asignaciones, creación y modificación
  de rutinas y registro de objetivos y progresos (FR-023), en modo
  best-effort heredado (un fallo de auditoría no revierte la operación).
- **Rationale**: la tabla existe desde el Sprint 2 con los campos necesarios
  (`usuario_id`, `accion`, `modulo`, `fecha`, `resultado`, `descripcion`) y el
  insumo pide usarla "según las acciones definidas para el sistema"; ampliar
  `modulo` conserva `GET /api/auditoria?modulo=` como única consulta de
  auditoría y evita tablas dispersas por sprint.
- **Alternatives considered**: tabla de auditoría nueva por sprint (la
  consulta de auditoría quedaría fragmentada); campo JSON de "acciones" en
  cada tabla (no consultable con la interfaz existente); auditoría solo en
  base de datos con triggers (oculta el usuario de aplicación y complica las
  pruebas).

## R-36: Migración y semillas del Sprint 3

- **Decision**: `database/migrations/003_sprint3.sql` crea las 6 tablas
  nuevas (`entrenadores`, `asignaciones_entrenador`, `rutinas`,
  `ejercicios_rutina`, `objetivos_entrenamiento`, `progresos_clientes`) y la
  vista `estadisticas_dashboard`, con `CREATE TABLE IF NOT EXISTS`, InnoDB,
  `utf8mb4` e índices siguiendo el estilo de `001_initial.sql` y
  `002_sprint2.sql`. **Sin semillas nuevas**: no se crean usuarios de ejemplo
  (la contraseña requiere hash `bcrypt` y las cuentas de prueba ya existen);
  los datos del sprint (entrenador, asignación, rutina) se dan de alta por API
  en los escenarios del quickstart.
- **Rationale**: la constitución (Principio IV) exige scripts versionados
  reconstruibles desde cero (001 → 002 → 003); semillas con hash en texto
  plano romperían la seguridad de `usuarios`, y un seed de rutinas exigiría
  IDs de clientes y entrenadores que solo existen tras el alta por API.
- **Alternatives considered**: semilla con hash `bcrypt` precalculado
  (depende de `JWT_SECRET`/entorno y se ensucia con usuarios ficticios);
  script incremental en JS (las migraciones del proyecto son SQL puro);
  una migración por tabla (pérdida de atomicidad al desplegar).

## R-37: Vistas y navegación del frontend por rol

- **Decision**: se añaden 6 páginas al árbol `VISTAS` de `frontend/src/App.jsx`
  con la misma convención de roles heredada (el rol decide qué vistas existen
  y el backend vuelve a validar): `EntrenadoresPage` (administrador y
  recepcionista: personal completo con carga; entrenador: su propia carga),
  `AsignacionesPage`, `RutinasPage`, `SeguimientoPage` (objetivos y
  progresos), `DashboardPage` (administrador: completo; entrenador: panel de
  su carga) y `MiRutinaPage` (cliente: su rutina y evolución). Los servicios
  de API del frontend (`entrenadores.api.js`, `asignaciones.api.js`,
  `rutinas.api.js`, `seguimiento.api.js`, `dashboard.api.js`) replican el
  patrón de `services/*.api.js` existente.
- **Rationale**: la navegación por rol ya está probada en los sprints
  anteriores y la constitución (Principio V) recuerda que ocultar opciones no
  es seguridad: cada vista sigue respaldada por la matriz en el servidor; una
  sola `DashboardPage` con contenido condicional evita duplicar la pantalla y
  mantiene el filtro de periodo en un solo componente.
- **Alternatives considered**: un router con guardas nuevas o librería de
  rutas (dependencia nueva sin necesidad, `VISTAS` ya filtra); dos páginas
  separadas de dashboard (duplica indicadores y lógica de periodo); páginas
  por recurso de entrenador dentro de `ClientesPage` (mezcla módulos y
  permisos de HU2 con los de HU3/HU4).

## Unknowns resueltos

| Unknown / decisión pendiente | Resolución |
|------------------------------|------------|
| Vínculo entrenador ↔ usuario | R-28: tabla `entrenadores` con `usuario_id` UNIQUE y validación de rol y estado |
| Un solo entrenador principal por cliente | R-29: `asignaciones_entrenador` con cierre automático en transacción |
| Almacenamiento de ejercicios | R-30: tabla `ejercicios_rutina` normalizada y validada por columna |
| Rutina activa única por cliente | R-31: `estado` activa/archivada con archivado automático al crear la nueva |
| Historial de metas y progreso | R-32: `objetivos_entrenamiento` + `progresos_clientes` sin borrado |
| Cómo se alimenta el dashboard | R-33: vista `estadisticas_dashboard` + agregados parametrizados por periodo |
| Permisos por rol y por carga | R-34: `MATRIZ_PERMISOS` extendida + pertenencia validada en el servicio |
| Auditoría de acciones del sprint | R-35: tabla `auditoria` reutilizada con nuevos valores de `modulo` |
| Migración y seeds del Sprint 3 | R-36: `003_sprint3.sql` con 6 tablas + vista; sin seeds nuevos |
| Navegación por rol en el frontend | R-37: 6 páginas nuevas en `VISTAS` con el patrón heredado |
