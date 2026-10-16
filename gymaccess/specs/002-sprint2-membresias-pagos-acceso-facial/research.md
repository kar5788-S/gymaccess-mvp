# Phase 0: Research — Membresías, pagos, reconocimiento facial y control de acceso (Sprint 2)

**Date**: 2026-10-12 | **Plan**: [plan.md](plan.md) | **Actualizado**: 2026-10-14 (sincronizado con las aclaraciones de `/speckit.clarify`)

Resolución de los unknowns del Technical Context del Sprint 2 y de las
decisiones pendientes del insumo (`docs/sprints/sprint-2.md`, sección 9)
aplicables a este alcance. Las decisiones R-01…R-12 del Sprint 1 se heredan sin
cambios (ver `specs/001-sprint1-auth-clientes/research.md`). Formato: Decisión /
Justificación / Alternativas consideradas.

## R-13: Librería de reconocimiento facial (unknown principal; decisión pendiente de docs/reglas.md)

- **Decision**: `@vladmandic/face-api` en el frontend (npm, licencia MIT),
  con los pesos del modelo alojados localmente en `frontend/public/modelos/`.
- **Rationale**: es la fork mantenida de face-api.js (v1.5.x, publicaciones
  activas) mientras que la librería original quedó en 0.22.2 sin publicaciones
  desde hace años; expone una API equivalente (`detectSingleFace(…)
  .withFaceLandmarks().withFaceDescriptor()`) que devuelve un descriptor
  numérico de 128 dimensiones, corre en el navegador con TensorFlow.js/WebGL
  sin servicios externos, es compatible con React y con ES Modules, es gratuita
  y su documentación es amplia en proyectos académicos.
- **Alternatives considered**: `face-api.js` original (misma API pero sin
  mantenimiento ni compatibilidad con TensorFlow.js moderno);
  `@vladmandic/human` (más potente y mantenida, pero más pesada y con más
  modelos de los que el alcance necesita); `@tensorflow-models/*` (detección sin
  reconocimiento útil para este alcance); servicios en la nube (AWS
  Rekognition, Clarifai — de pago, externos y prohibidos por el alcance);
  OpenCV/dlib (no son JavaScript y romperían el stack de la constitución).

## R-14: Dónde se ejecuta el procesamiento facial (pendiente del insumo)

- **Decision**: división Frontend/Backend. El frontend captura el rostro con
  la cámara y calcula el descriptor con `@vladmandic/face-api`; envía
  únicamente el descriptor (128 números) al backend. El backend almacena los
  descriptores y realiza el cotejo en el servidor con distancia euclidiana
  entre vectores (aritmética pura, sin TensorFlow.js en el servidor).
- **Rationale**: los descriptores almacenados nunca salen del backend ni se
  exponen en respuestas (FR-017), las imágenes faciales no se envían ni se
  guardan, la comparación ocurre en el servidor donde los permisos se pueden
  hacer valer (RN-13), y el backend evita dependencias nativas pesadas
  (`tfjs-node` compila binarios con problemas conocidos en Windows).
- **Alternatives considered**: procesamiento completo en el backend (requiere
  subir imágenes por petición y agregar `@tensorflow/tfjs-node` + `canvas`,
  más lento y más superficie de datos sensibles); procesamiento completo en el
  frontend con envío de todos los descriptores al cliente (viola FR-017: los
  datos biométricos llegarían al frontend); librerías de servidor en otro
  lenguaje (rompe el stack).

## R-15: Almacenamiento del descriptor facial (pendiente del insumo)

- **Decision**: columna `descriptor_facial VARBINARY(512)` en la tabla
  `rostros`, con el vector de 128 `float32` serializado en little-endian (128 ×
  4 bytes = 512 bytes exactos). Una fila por cliente (UNIQUE en `cliente_id`).
- **Rationale**: el tamaño fijo permite usar `VARBINARY` (valida la longitud),
  la serialización float32 es directa y determinista, y una fila por cliente
  simplifica el reemplazo en el re-registro (FR-011).
- **Alternatives considered**: `JSON` en `TEXT` (más grande, parsing
  innecesario en cada cotejo), `DOUBLE` múltiple (MySQL no tiene arrays),
  almacenar la imagen (prohibido por el spec y la constitución).

## R-16: Umbral de coincidencia (pendiente del insumo)

- **Decision**: umbral de distancia euclidiana `0.6` por defecto, configurable
  mediante la variable de entorno `FACIAL_UMBRAL_COINCIDENCIA` en `.env`
  (documentada en `.env.example` sin valor secreto). Coincidencia válida =
  distancia ≤ umbral.
- **Rationale**: 0.6 es el umbral de referencia de la familia de modelos
  face-api para descriptores de 128 dimensiones; hacerlo configurable permite
  ajustarlo en las pruebas del punto de acceso (SC-004/SC-007) sin recompilar.
- **Alternatives considered**: umbral fijo en código (no ajustable en pruebas),
  aprendizaje por cliente (complejidad fuera de alcance), verificación de dos
  pasos con otra librería (dependencia adicional injustificada).

## R-17: Captura mediante cámara (pendiente del insumo)

- **Decision**: `navigator.mediaDevices.getUserMedia({ video: true })` en el
  frontend, con componente reutilizable `CapturaFacial` (video + canvas) que
  toma 5 muestras con separación de ~300 ms y promedia los 5 descriptores
  (promedio componente a componente) para registrar o identificar.
- **Rationale**: getUserMedia es la API nativa del navegador, sin
  dependencias; promediar varias muestras mejora la robustez frente a
  iluminación y ángulo; el componente es compartido por `RegistrarRostroPage`
  y `AccesoPage`.
- **Alternatives considered**: subir fotografías estáticas (más lento para el
  personal y peor experiencia en el acceso), librerías de cámara (APIs
  innecesarias), una sola muestra (menos estable).

## R-18: Métodos de pago (pendiente del insumo; resuelto en `/speckit.clarify`)

- **Decision**: catálogo de **un solo método: `efectivo`** (decisión del
  equipo en la sesión de clarificación del 2026-10-14). El campo
  `pagos.metodo` es `VARCHAR(30)` (ya existente) `NOT NULL` y el validador
  del backend rechaza cualquier valor distinto de `efectivo` con mensaje
  claro.
- **Rationale**: el alcance del sprint se reduce a registrar el cobro
  efectivo del gimnasio; un catálogo de un solo valor validado en el servidor
  evita datos inconsistentes y no requiere tablas de configuración. El campo
  se conserva (en lugar de eliminarlo) para no romper el esquema del Sprint 1
  ni las consultas de historial, y para dejar el hueco previsto para métodos
  futuros sin migración.
- **Alternatives considered**: catálogo de tres métodos (efectivo,
  transferencia, tarjeta — recomendado en la sesión pero descartado por el
  equipo); tabla `metodos_pago` configurable (innecesaria para cualquier
  número pequeño de valores); texto libre (datos inconsistentes y adeudos
  difíciles de agrupar); integración con pasarelas (fuera de alcance).

## R-19: Pagos parciales y cálculo de adeudos (pendiente del insumo)

- **Decision**: se permiten pagos parciales contra una membresía. El adeudo de
  una membresía se calcula como `membresias.precio − SUM(pagos.monto)` de sus
  pagos, con suelo en cero (`GREATEST(0, …)`). El precio de la membresía se
  congela en `membresias.precio` al momento de asignarla.
- **Rationale**: FR-009 exige saldo sin negativos; congelar el precio cumple
  FR-002 (modificar un tipo no altera membresías ya asignadas); los pagos
  quedan siempre en el historial (FR-008).
- **Alternatives considered**: adeudo por tipo vigente (rompe FR-002),
  bloquear pagos parciales (la decisión estaba pendiente y el gimnasio real
  financiá a plazos), nota de crédito separada (fuera de alcance).

## R-20: Estados de membresía y detección de vencimiento (pendiente del insumo)

- **Decision**: sin cron ni triggers. El estado almacenado se mantiene con
  transiciones explícitas (asignar→activa, suspender, cancelar, reactivar,
  renovar) y la condición "vencida" se evalúa por fecha en cada consulta y en
  la validación de acceso (`fecha_vencimiento < CURDATE()`); cuando la
  membresía consulta como vencida, el servicio actualiza el estado almacenado a
  `vencida`. Vigencia inclusiva: es válida durante todo su
  `fecha_vencimiento`; no hay tolerancia (spec y RN-08).
- **Rationale**: elimina procesos de fondo difíciles de probar, mantiene la
  regla en un solo lugar (servicio de membresías) y respeta la constitución
  (membresía vencida rechaza acceso).
- **Alternatives considerada**: `EVENT` de MySQL o job programado (estado
  divergente si no corre, más difícil de probar), triggers de UPDATE (lógica
  oculta en la BD, contra la separación de responsabilidades).

## R-21: Renovación, suspensión y cancelación (pendiente del insumo)

- **Decision**: renovar aplica a membresías `activa` o `vencida`, suma el
  `duracion_dias` del tipo a partir de la `fecha_vencimiento` vigente y deja
  la membresía en `activa`. Suspender y reactivar son exclusivos del
  administrador y aplican a `activa` y `suspendida` respectivamente; cancelar
  es exclusivo del administrador, aplica a `activa` o `vencida` y es
  terminal. `suspendida` y `cancelada` no autorizan acceso ni admiten
  renovación. **Al reactivar una membresía suspendida se conserva su
  `fecha_vencimiento` original: los días transcurridos en suspensión no se
  recuperan ni se suma tiempo adicional** (decisión de `/speckit.clarify`,
  sesión 2026-10-14).
- **Rationale**: cumple los escenarios US4 del spec, mantiene los controles de
  rol (FR-016) y deja `cancelada` como estado terminal para no perder
  historial.
- **Alternatives considered**: renovación desde cualquier estado (permitiría
  "revivir" una cancelación y perdería trazabilidad), suspensión automática
  por impago (política no definida en el alcance).

## R-22: Registro de auditoría (reglas de auditoría funcionales del sprint)

- **Decision**: servicio `auditoria.service.js` con `registrar({ usuarioId,
  accion, modulo, resultado, descripcion })`; se invoca desde los servicios en
  las acciones críticas: crear/modificar tipo de membresía, asignar, renovar,
  suspender/cancelar/reactivar membresía, registrar pago, registrar/reemplazar
  información facial, acceso autorizado y acceso rechazado. La consulta
  (`GET /api/auditoria`) es exclusiva del administrador.
- **Rationale**: el insumo exige que la auditoría sea funcional en este sprint
  sin definir reglas; registrar en el servicio (no en el controlador) garantiza
  que quede la acción aunque falle la respuesta HTTP, y la tabla queda lista
  para sprintes posteriores.
- **Alternatives considered**: middleware genérico que audita todo petición
  (ruido y sin semántica de negocio), auditoría solo en el frontend (sin
  garantía, viola permisos), trigger de MySQL (duplica lógica en la BD).

## R-23: Registro de intentos de acceso (pendiente del insumo)

- **Decision**: tabla `accesos` con `cliente_id` NULLable (NULL cuando el
  rostro no se identificó), `fecha`, `hora`, `resultado`
  (`autorizado`/`rechazado`) y `motivo_rechazo` (obligatorio cuando el
  resultado es `rechazado`, motivos: `membresia_vencida`,
  `membresia_suspendida`, `membresia_cancelada`, `sin_membresia`,
  `rostro_no_identificado`). Todo intento se registra antes de responder
  (FR-015); no existen operaciones de borrado.
- **Rationale**: el spec exige conservar los intentos con su motivo; los
  motivos fijos permiten filtrar y reportar de forma consistente.
- **Alternatives considered**: tabla de log libre (motivos no normalizados),
  registrar solo rechazos (viola RN-10), borrar por antigüedad (viola la
  regla de historial).

## R-24: Manejo de intentos fallidos de reconocimiento (pendiente del insumo)

- **Decision**: sin bloqueo ni límite de intentos: cada intento no identificado
  se registra como rechazado con motivo `rostro_no_identificado` y el sistema
  responde con un mensaje claro para que el personal atienda al cliente. El
  umbral R-16 es la defensa contra falsos positivos.
- **Rationale**: el spec establece que el sistema no bloquea de forma
  permanente al cliente y que el personal atiende conforme a las políticas del
  gimnasio; agregar bloqueos introduciría reglas nuevas fuera del alcance.
- **Alternatives considered**: bloqueo temporal del punto de acceso tras N
  fallos (complica la operación diaria), verificación con otro dato por
  defecto (fuera de alcance).

## R-25: Migración y semillas del Sprint 2

- **Decision**: `database/migrations/002_sprint2.sql` con los ALTER de
  `tipos_membresia` (descripcion, estado), `membresias` (precio congelado) y
  `pagos` (`membresia_id` NOT NULL, `metodo` NOT NULL), más el CREATE de
  `rostros`, `accesos` y `auditoria`; seed
  `database/seeds/002_tipos_membresia.sql` con 3 planes de ejemplo (mensual,
  trimestral, anual). Nombres en minúsculas, InnoDB y `utf8mb4` como en la
  migración 001.
- **Rationale**: la constitución exige scripts SQL versionados y cambios
  documentados; los seeds permiten demostrar el flujo completo sin preparación
  manual.
- **Alternatives considered**: recrear tablas (pérdida del esquema del Sprint
  1), seeds en JavaScript (duplica la fuente de verdad del esquema).

## R-26: Bloqueo de asignación y renovación por adeudo pendiente (FR-023, clarify 2026-10-14)

- **Decision**: antes de crear o renovar una membresía, el servicio consulta el
  adeudo total del cliente (suma de saldos pendientes de todas sus membresías)
  y, si es mayor que cero, rechaza la operación con mensaje claro
  ("primero debe saldarse el adeudo"). El pago correspondiente se registra
  contra la membresía original para desbloquear la operación.
- **Rationale**: decisión explícita del equipo en la sesión de clarificación;
  mantiene el control financiero sin crear estados nuevos y evita que un
  cliente con deuda acumule periodos adicionales. La validación vive en el
  servicio (no en la interfaz), conforme al Principio V, y no requiere
  columnas ni índices adicionales: reutiliza el cálculo de adeudo de R-19.
- **Alternatives considered**: no bloquear y solo mostrar el adeudo
  (recomendado en la sesión pero descartado por el equipo); exigir
  autorización del administrador (agrega un flujo de aprobación fuera de
  alcance); bloquear solo la renovación pero no la asignación nueva
  (inconsistente: ambas amplían el acceso del cliente).

## R-27: Eliminación de la información facial al dar de baja al cliente (FR-022, clarify 2026-10-14)

- **Decision**: cuando un cliente se da de baja o pasa a estado inactivo, el
  servicio de rostros **elimina físicamente la fila** de `rostros` de ese
  cliente (borrado de `descriptor_facial`). Si el cliente se reactiva, debe
  capturarse de nuevo antes de poder identificarlo en el punto de acceso. La
  baja del cliente se valida/propaga en el mismo flujo de servicio que
  actualiza `clientes.estado`.
- **Rationale**: decisión del equipo en la clarificación; no se conserva
  información biométrica de quien dejó de ser cliente (Principio V y VIII).
  La prohibición de DELETE de la constitución aplica a pagos, accesos y
  auditoría, no a `rostros`, cuyo dato es volatile por definición.
- **Alternatives considered**: marcar `rostros.estado = 'inactivo'` y
  conservar el descriptor (descartado: mantiene dato biométrico sin
  justificación); conservar el descriptor activo y confiar en la rechaza de
  acceso por membresía (descartado: seguiría identificando a un excliente);
  borrado en cascada desde la FK (la propagación se hace en el servicio para
  dejarla auditada y probada, no implícita en la BD).

## Unknowns resueltos

| Unknown del Technical Context / insumo | Resolución |
|----------------------------------------|------------|
| Librería de reconocimiento facial | R-13: `@vladmandic/face-api` (MIT, local) |
| Compatibilidad con React y Node.js | R-14: librería en el navegador + cotejo aritmético en Node |
| Lugar del procesamiento facial | R-14: captura y descriptor en frontend; almacenamiento y cotejo en backend |
| Almacenamiento de descriptores | R-15: `VARBINARY(512)` en `rostros` |
| Protección de datos biométricos | R-13/R-14/R-15: sin imágenes, descriptor no expuesto, endpoints protegidos |
| Descriptores vs. imágenes temporales | R-14: solo descriptores; las muestras viven solo en la pestaña abierta |
| Umbral de coincidencia | R-16: 0.6 configurable por `.env` |
| Condiciones de iluminación | R-17: 5 muestras promediadas; guía en quickstart.md |
| Cámara para pruebas | R-17: cualquier webcam compatible con getUserMedia (localhost/HTTPS) |
| Intentos fallidos de reconocimiento | R-24: sin bloqueo; cada intento se registra |
| Mensaje al no reconocer al cliente | R-23/R-24: mensaje claro sin datos internos, intento registrado |
| Métodos de pago | R-18: **solo `efectivo`** (clarify 2026-10-14; validado en backend) |
| Pagos parciales | R-19: permitidos; adeudo con suelo en cero |
| Adeudo pendiente vs. asignar/renovar | R-26: se bloquea hasta saldar el adeudo (clarify 2026-10-14) |
| Política de membresías suspendidas | R-21: no autorizan acceso; solo administrador las gestiona; al reactivar conserva la fecha de vencimiento original (clarify 2026-10-14) |
| Baja de cliente e información facial | R-27: se elimina el descriptor; una reactivación exige nueva captura (clarify 2026-10-14) |
| Consulta de la membresía propia por el cliente | Contrato read-only `GET /api/clientes/yo/membresia` en `contracts/api.md` (clarify 2026-10-14) |
| Tolerancia tras vencimiento | R-20: ninguna; vigencia inclusiva |
| Renovación antes de vencimiento | R-21: suma desde la fecha de vencimiento vigente |
| Reglas de auditoría funcionales | R-22: acciones críticas del sprint, consulta solo admin |
