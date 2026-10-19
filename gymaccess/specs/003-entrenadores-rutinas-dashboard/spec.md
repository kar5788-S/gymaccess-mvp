# Especificación de la funcionalidad: Entrenadores, rutinas de entrenamiento y dashboard administrativo (Sprint 3)

**Feature Branch**: `003-entrenadores-rutinas-dashboard`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Usa la descripción de @docs/sprints/sprint-3.md" (fuente: `docs/sprints/sprint-3.md`)

## Clarifications

### Session 2026-10-15

- Q: ¿Quién debe poder consultar el dashboard de indicadores: únicamente el administrador, o también otros roles con conjuntos reducidos de indicadores? → A: El administrador ve el dashboard completo; el entrenador ve un panel propio reducido solo con los indicadores de su carga (clientes asignados, rutinas y progresos de sus clientes), sin cifras financieras; el recepcionista y el cliente reciben denegación.
- Q: Cuando se asigna un entrenador distinto a un cliente que ya tiene entrenador responsable vigente, ¿qué debe hacer el sistema con la asignación actual? → A: Cierre automático de la anterior con fecha de fin, la nueva queda vigente y todo el historial de asignaciones se conserva.
- Q: Cuando un cliente ya tiene una rutina activa y su entrenador crea otra nueva, ¿debe quedar una sola rutina activa por cliente o pueden coexistir varias rutinas activas a la vez? → A: Una sola rutina activa por cliente: la nueva archiva automáticamente la anterior y ambas se conservan como historial.
- Q: Además del entrenador, ¿puede el cliente registrar sus propios progresos (peso, medidas o comentarios) desde su cuenta, o solo el entrenador los registra? → A: Solo el entrenador y el administrador en supervisión (consulta y edición); el cliente nunca escribe objetivos ni progresos y su consulta permanece en modo solo lectura.
- Q: ¿Debe poder el recepcionista consultar en modo solo lectura las rutinas y los progresos de los clientes, o se le debe denegar también esa consulta? → A: Puede consultar las rutinas en modo solo lectura (planes de ejercicios), pero no consulta los progresos (medidas y comentarios) y en ningún caso los edita.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Registro de entrenadores (Prioridad: P1)

Como administrador, quiero registrar a los entrenadores del gimnasio y
asociarlos a una cuenta de usuario, para definir quiénes estarán a cargo del
acompañamiento de los clientes.

**Por qué esta prioridad**: Es la base de todo el sprint: sin entrenadores
registrados no es posible asignarlos a clientes, crear rutinas ni alimentar
los indicadores del dashboard. Entrega valor por sí sola al permitir llevar
la relación de personal de coaching del gimnasio.

**Prueba independiente**: Puede probarse de forma independiente registrando un
entrenador desde la cuenta administradora, verificando que quede asociado a un
usuario con rol de entrenador, que aparezca en la consulta y que un rol sin
permiso sea denegado.

**Escenarios de aceptación**:

1. **Dado** una sesión de administrador, **Cuando** registra un entrenador con
   nombre, datos de contacto y un usuario con rol de entrenador activo,
   **Entonces** el entrenador queda registrado y disponible para ser asignado
   a clientes.
2. **Dado** un usuario inexistente o con un rol distinto al de entrenador,
   **Cuando** el administrador intenta asociarlo como entrenador, **Entonces**
   el sistema rechaza la operación e indica que se requiere un usuario válido
   con rol de entrenador.
3. **Dado** un entrenador registrado, **Cuando** el administrador modifica sus
   datos de contacto o su estado, **Entonces** los cambios quedan guardados sin
   afectar a sus clientes ni a sus rutinas ya registradas.
4. **Dado** una sesión de un rol sin permiso (recepcionista, entrenador o
   cliente), **Cuando** intenta crear o modificar entrenadores, **Entonces** el
   sistema deniega la operación.
5. **Dado** un administrador con entrenadores registrados, **Cuando** los
   consulta, **Entonces** ve cada entrenador con su nombre, contacto, usuario
   asociado y estado.

---

### Historia de usuario 2 - Asignación de entrenador a cliente (Prioridad: P1)

Como administrador o recepcionista, quiero asignar un entrenador a un cliente
activo para establecer la responsabilidad del seguimiento físico y de
entrenamiento.

**Por qué esta prioridad**: Conecta al personal con los clientes y es
prerrequisito para las rutinas: un entrenador solo podrá gestionar a los
clientes de su carga. Además define quién responde del seguimiento de cada
cliente.

**Prueba independiente**: Puede probarse de forma independiente asignando un
entrenador a un cliente activo desde una cuenta de administrador o
recepcionista y verificando que el entrenador quede como responsable vigente
y que el historial de la asignación anterior (si existía) se conserve.

**Escenarios de aceptación**:

1. **Event-driven**: CUANDO un administrador o recepcionista asigna un
   entrenador registrado a un cliente activo sin responsable vigente, EL
   SISTEMA DEBE registrar la fecha de asignación y agregar al cliente a la carga
   del entrenador.
2. **Event-driven**: CUANDO se asigna un entrenador diferente a un cliente con
   una asignación vigente, EL SISTEMA DEBE cerrar la asignación anterior con su
   fecha de fin, dejar vigente la nueva y conservar el historial sin más de un
   entrenador principal activo.
3. **Unwanted behavior**: SI se intenta asignar un entrenador a un cliente
   inexistente o inactivo, ENTONCES EL SISTEMA DEBE rechazar la operación y no
   registrar la asignación.
4. **Unwanted behavior**: SI se intenta usar en una asignación un usuario sin
   perfil de entrenador o cuyo usuario esté inactivo, ENTONCES EL SISTEMA DEBE
   rechazar la operación.
5. **Event-driven**: CUANDO el administrador consulta la ficha de un cliente o
   la carga de un entrenador con asignaciones, EL SISTEMA DEBE mostrar al
   responsable vigente y conservar las asignaciones anteriores como historial.
6. **Unwanted behavior**: SI un entrenador o cliente intenta crear, modificar o
   cerrar asignaciones, ENTONCES EL SISTEMA DEBE denegar la operación.

---

### Historia de usuario 3 - Creación de rutinas de entrenamiento (Prioridad: P1)

Como entrenador, quiero crear rutinas personalizadas con ejercicios, series,
repeticiones o instrucciones para los clientes asignados, para orientar su
plan de entrenamiento.

**Por qué esta prioridad**: Es el núcleo de valor del sprint para el rol de
entrenador: sin rutinas no hay acompañamiento que ofrecer ni información que
consultar después.

**Prueba independiente**: Puede probarse de forma independiente desde una
cuenta de entrenador con al menos un cliente asignado, creando una rutina con
varios ejercicios y verificando que quede guardada, asociada al cliente y al
entrenador, y que un entrenador distinto no pueda modificarla.

**Escenarios de aceptación**:

1. **Dado** un entrenador con un cliente asignado, **Cuando** crea una rutina
   con nombre y al menos un ejercicio que incluya series, repeticiones o
   instrucciones, **Entonces** la rutina queda guardada asociada a ese cliente
   y a ese entrenador, con estado activo.
2. **Dado** un cliente sin entrenador responsable, **Cuando** un entrenador
   intenta crearle una rutina, **Entonces** el sistema rechaza la operación
   porque el cliente no está en su carga.
3. **Dado** un cliente asignado a otro entrenador, **Cuando** un entrenador
   intenta crearle o modificarle una rutina, **Entonces** el sistema deniega
   la operación.
4. **Dado** un cliente con una rutina activa, **Cuando** su entrenador crea una
   nueva rutina, **Entonces** la rutina anterior pasa a archivada, la nueva
   queda activa y ambas se conservan como historial.
5. **Dado** una rutina existente, **Cuando** el entrenador agrega, modifica o
   reordena ejercicios, **Entonces** los cambios quedan guardados y la rutina
   sigue asociada al mismo cliente y entrenador.
6. **Dado** una sesión del administrador, **Cuando** consulta las rutinas de
   cualquier cliente, **Entonces** puede verlas y editarlas en supervisión;
   **Cuando** un recepcionista consulta una rutina, **Entonces** la ve en modo
   solo lectura; **Cuando** un recepcionista o un cliente intenta crear o
   modificar rutinas, **Entonces** el sistema deniega la operación.
7. **Dado** una rutina con datos inválidos (sin nombre, sin ejercicios, series
   o repeticiones en cero o negativas), **Cuando** se intenta guardar,
   **Entonces** el sistema rechaza la operación, indica el dato incorrecto y
   no guarda la rutina.

---

### Historia de usuario 4 - Registro de objetivos y progresos (Prioridad: P2)

Como entrenador, quiero registrar objetivos y avances del cliente
(descripción, meta, mediciones y comentarios) para seguir su evolución de
forma ordenada y medible.

**Por qué esta prioridad**: Aporta el seguimiento longitudinal del cliente;
depende de que existan clientes asignados y rutinas, por lo que se construye
encima de las historias anteriores.

**Prueba independiente**: Puede probarse de forma independiente registrando un
objetivo para un cliente asignado, añadiendo dos registros de progreso con
fechas distintas y verificando que el historial se conserve en orden y que un
rol sin permiso no pueda editarlo.

**Escenarios de aceptación**:

1. **Dado** un entrenador con un cliente asignado, **Cuando** registra un
   objetivo con descripción, meta y fecha opcional, **Entonces** el objetivo
   queda guardado en estado en curso y asociado al cliente.
2. **Dado** un cliente con objetivos, **Cuando** el entrenador registra un
   progreso con fecha, medición y comentario, **Entonces** el registro queda
   guardado y se suma al historial de evolución.
3. **Dado** un objetivo con progresos registrados, **Cuando** el entrenador
   modifica el objetivo o lo marca como cumplido, **Entonces** los progresos
   previos se conservan intactos.
4. **Dado** un historial de progresos, **Cuando** el entrenador consulta la
   evolución del cliente, **Entonces** ve los registros ordenados por fecha
   para comparar el avance en el tiempo.
5. **Dado** una sesión de recepcionista o cliente, **Cuando** intenta crear o
   modificar objetivos o progresos, **Entonces** el sistema deniega la
   operación, y el recepcionista tampoco puede consultar los progresos; el
   administrador sí puede consultarlos y editarlos en supervisión.
6. **Dado** un progreso con fecha inválida o sin datos de medición,
   **Cuando** se intenta guardar, **Entonces** el sistema rechaza la operación
   e indica el dato incorrecto.

---

### Historia de usuario 5 - Consulta de rutina y progreso por el cliente (Prioridad: P2)

Como cliente, quiero consultar mi rutina y mi progreso desde mi cuenta, para
conocer mi evolución y mantenerme motivado.

**Por qué esta prioridad**: Es el consumidor final del trabajo del entrenador
y refuerza la regla de que cada cliente solo ve lo suyo; puede construirse
después de que existan rutinas y progresos.

**Prueba independiente**: Puede probarse de forma independiente iniciando
sesión como cliente con una rutina activa y verificando que muestre sus
ejercicios y su evolución, y que un cliente distinto no pueda ver esa
información.

**Escenarios de aceptación**:

1. **Event-driven**: CUANDO un cliente inicia sesión y consulta una rutina
   activa, EL SISTEMA DEBE mostrar el nombre del plan y sus ejercicios con
   series, repeticiones o instrucciones.
2. **Event-driven**: CUANDO un cliente consulta su evolución, EL SISTEMA DEBE
   mostrar sus objetivos y el historial de sus avances en orden de fecha.
3. **Event-driven**: CUANDO un cliente sin rutina asignada consulta su rutina,
   EL SISTEMA DEBE mostrar un mensaje claro de que aún no tiene rutina, sin
   errores técnicos.
4. **Unwanted behavior**: SI un cliente autenticado intenta consultar la rutina
   o el progreso de otro cliente, ENTONCES EL SISTEMA DEBE denegar la consulta
   sin exponer información ajena e indicar que no tiene permiso o que el recurso
   no existe.
5. **Event-driven**: CUANDO un cliente con rutinas archivadas y una activa
   consulta su información, EL SISTEMA DEBE mostrar la rutina activa como su
   plan vigente.

---

### Historia de usuario 6 - Dashboard administrativo (Prioridad: P3)

Como administrador, quiero ver un resumen de clientes activos, entrenadores,
membresías, ingresos, accesos y progreso general del gimnasio, para tomar
decisiones operativas de un vistazo. El entrenador, por su parte, consulta un
panel propio con solo los indicadores de su carga.

**Por qué esta prioridad**: Es una capa de síntesis que se alimenta de datos
ya existentes (clientes, membresías, pagos, accesos) y de los datos nuevos de
este sprint (entrenadores, rutinas, progresos); su valor completo se alcanza
cuando las historias anteriores ya operan.

**Prueba independiente**: Puede probarse de forma independiente abriendo la
vista como administrador y verificando que muestre las cifras de los
indicadores concordando con los registros existentes, que el entrenador solo
vea los indicadores de su carga y que el recepcionista y el cliente reciban
denegación de acceso.

**Escenarios de aceptación**:

1. **Event-driven**: CUANDO el administrador abre el dashboard, EL SISTEMA DEBE
   mostrar indicadores de clientes totales y activos, membresías activas y
   vencidas, ingresos y pagos del periodo, accesos recientes autorizados y
   rechazados, entrenadores registrados, clientes con entrenador asignado,
   clientes con rutina activa y objetivos cumplidos o en curso.
2. **Event-driven**: CUANDO el administrador selecciona un periodo (mes actual,
   últimos 30 días o histórico), EL SISTEMA DEBE recalcular los indicadores
   correspondientes a ese periodo.
3. **Unwanted behavior**: SI un recepcionista o cliente intenta consultar el
   dashboard, ENTONCES EL SISTEMA DEBE denegar la operación.
4. **Unwanted behavior**: SI no existen registros para un indicador del
   dashboard, ENTONCES EL SISTEMA DEBE mostrar cero o un mensaje vacío claro,
   sin producir errores.
5. **Event-driven**: CUANDO un administrador o entrenador consulta el
   dashboard, EL SISTEMA DEBE presentar los datos como cifras y resúmenes sin
   exponer información sensible detallada de clientes que el usuario no tenga
   derecho a consultar.
6. **Event-driven**: CUANDO un entrenador abre su panel de indicadores, EL
   SISTEMA DEBE limitarlo a su carga (clientes asignados, rutinas y progresos
   de sus clientes) y no mostrar ingresos, pagos ni otras cifras financieras
   del gimnasio.

---

### Historia de usuario 7 - Consulta del personal asignado (Prioridad: P3)

Como administrador o recepcionista, quiero consultar los clientes asignados a
cada entrenador, para organizar la carga de trabajo del equipo.

**Por qué esta prioridad**: Es una vista de apoyo operativo que depende de
que existan entrenadores y asignaciones registradas.

**Prueba independiente**: Puede probarse de forma independiente consultando el
listado de personal con los clientes de cada entrenador y verificando que los
conteos y relaciones correspondan a las asignaciones registradas.

**Escenarios de aceptación**:

1. **Event-driven**: CUANDO un administrador o recepcionista consulta el
   personal asignado, EL SISTEMA DEBE mostrar los entrenadores, sus clientes
   vigentes y el conteo de carga de cada uno.
2. **Event-driven**: CUANDO un usuario autorizado selecciona a un entrenador
   del listado de personal, EL SISTEMA DEBE mostrar los clientes de su carga y
   el estado de cada uno.
3. **Event-driven**: CUANDO se consulta el listado y un entrenador no tiene
   clientes asignados, EL SISTEMA DEBE mostrar una carga de cero y un mensaje
   claro, sin error.
4. **Event-driven**: CUANDO un entrenador consulta su carga, EL SISTEMA DEBE
   mostrar únicamente a sus clientes asignados.
5. **Unwanted behavior**: SI un cliente intenta consultar el personal asignado,
   ENTONCES EL SISTEMA DEBE denegar la operación.

---

### Casos límite

- ¿Qué ocurre cuando un entrenador es dado de baja o su usuario pasa a
  inactivo? Sus asignaciones vigentes deben poder cerrarse por el
  administrador; sus rutinas y progresos se conservan como historial y sus
  clientes quedan sin responsable hasta una nueva asignación.
- ¿Qué ocurre si un cliente es dado de baja o pasa a inactivo? No acepta
  nuevas asignaciones ni rutinas nuevas; su información existente se conserva.
- ¿Qué ocurre si un entrenador intenta operar sobre un cliente que dejó de
  estar en su carga tras una reasignación? Se le deniega la operación desde
  ese momento y la rutina queda bajo la responsabilidad del nuevo entrenador.
- ¿Qué ocurre cuando se reasigna un cliente repetidamente? Cada cambio cierra
  la asignación anterior y conserva todas las vigencias anteriores; nunca debe
  existir más de un entrenador principal activo por cliente.
- ¿Qué ocurre si un cliente no tiene membresía vigente? Puede tener
  entrenador, rutina y progreso: el seguimiento deportivo no depende de la
  vigencia de la membresía (ésta solo gobierna el acceso al gimnasio).
- ¿Qué ocurre si un cliente no tiene rutina? Su consulta muestra un mensaje
  claro vacío; el dashboard lo cuenta como cliente sin rutina activa.
- ¿Qué ocurre si un cliente tiene varias rutinas archivadas y ninguna activa?
  Su plan vigente aparece como "sin rutina activa"; el entrenador puede
  activar una existente o crear una nueva.
- ¿Qué ocurre si dos entrenadores intentan trabajar sobre el mismo cliente?
  Solo el responsable vigente puede operar; el otro recibe denegación.
- ¿Qué ocurre si un objetivo nunca recibe registros de progreso? Permanece en
  curso y se muestra como objetivo sin avances registrados.
- ¿Qué ocurre si el dashboard no tiene datos de un indicador (por ejemplo, sin
  entrenadores registrados aún)? Muestra cero o mensaje vacío, sin error.
- ¿Qué ocurre si se intenta guardar una rutina sin ejercicios o con series o
  repeticiones en cero? Se rechaza con mensaje que señala el dato incorrecto.
- ¿Qué ocurre si la fecha de un progreso es futura o inválida? La fecha
  futura puede admitirse como planeación, pero una fecha ilegible se rechaza
  con mensaje claro.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **FR-001**: El sistema DEBE permitir al administrador registrar entrenadores
  asociándolos a una cuenta de usuario existente con rol de entrenador y
  estado activo.
- **FR-002**: El sistema DEBE impedir asociar un perfil de entrenador a un
  usuario inexistente, inactivo o con un rol distinto al de entrenador.
- **FR-003**: El sistema DEBE permitir al administrador consultar y modificar
  los datos de los entrenadores sin perder sus asignaciones ni sus rutinas.
- **FR-004**: El sistema DEBE permitir a administrador y recepcionista asignar
  un entrenador a un cliente con estado activo, registrando la fecha de la
  asignación.
- **FR-005**: El sistema DEBE mantener un solo entrenador principal activo por
  cliente: al asignar uno nuevo, la asignación anterior se cierra con su fecha
  de fin y se conserva como historial.
- **FR-006**: El sistema NO DEBE permitir asignaciones hacia clientes
  inexistentes o inactivos, ni usar usuarios sin perfil de entrenador válido o
  con el usuario inactivo.
- **FR-007**: El sistema DEBE permitir consultar los clientes asignados a cada
  entrenador con el conteo de su carga, para administrador y recepcionista; el
  entrenador consulta únicamente su propia carga.
- **FR-008**: El sistema DEBE permitir al entrenador crear y modificar rutinas
  únicamente para los clientes de su carga; el administrador puede consultar y
  editar cualquier rutina en supervisión.
- **FR-009**: El sistema DEBE exigir que cada rutina tenga nombre y al menos
  un ejercicio, y que cada ejercicio incluya series, repeticiones o
  instrucciones con valores válidos (enteros mayores que cero cuando
  apliquen).
- **FR-010**: El sistema DEBE conservar las rutinas con un estado (activa o
  archivada), permitiendo una única rutina activa por cliente, y NO DEBE
  eliminar rutinas, ejercicios, objetivos ni progresos de manera ordinaria.
- **FR-011**: El sistema DEBE permitir al entrenador registrar objetivos de
  entrenamiento (descripción, meta y fecha opcional) y marcar su estado
  (en curso o cumplido) para los clientes de su carga; el administrador puede
  hacerlo para cualquier cliente en supervisión (consulta y edición).
- **FR-012**: El sistema DEBE permitir al entrenador registrar progresos del
  cliente con fecha, medición y comentario, y conservar el historial completo
  en orden de fecha para comparar la evolución en el tiempo; el administrador
  puede registrarlos y editarlos en supervisión.
- **FR-013**: El sistema DEBE garantizar que modificar o cumplir un objetivo
  no elimine ni altere los progresos ya registrados.
- **FR-014**: El sistema DEBE permitir al cliente consultar en modo solo
  lectura su propia rutina activa y su propio historial de objetivos y
  progresos, y NUNCA exponerle información de otros clientes.
- **FR-015**: El sistema DEBE mostrar al cliente un mensaje claro y sin
  errores técnicos cuando no tenga una rutina activa registrada.
- **FR-016**: El sistema DEBE proporcionar al administrador un dashboard con
  indicadores al menos de: clientes totales y activos, membresías activas y
  vencidas, ingresos y pagos del periodo, accesos recientes autorizados y
  rechazados, entrenadores registrados, clientes con entrenador asignado,
  clientes con rutina activa y objetivos cumplidos o en curso.
- **FR-017**: El sistema DEBE permitir filtrar los indicadores del dashboard
  por periodo (mes actual, últimos 30 días e histórico).
- **FR-018**: El sistema DEBE ofrecer el dashboard completo al rol
  administrador y un panel reducido al entrenador con solo los indicadores de
  su carga (clientes asignados, rutinas y progresos), y DENEGAR la consulta al
  recepcionista y al cliente, validando el permiso en el servidor.
- **FR-019**: El sistema DEBE presentar los indicadores como cifras y
  resúmenes agregados, sin exponer en el dashboard información sensible
  detallada de clientes que el usuario no tenga derecho a consultar.
- **FR-020**: El sistema DEBE permitir al recepcionista consultar el listado
  de personal y los clientes asignados a cada entrenador, así como las rutinas
  de los clientes en modo solo lectura, y DENEGARLE consultar los progresos y
  crear o editar rutinas, objetivos o progresos.
- **FR-021**: El sistema DEBE validar los permisos de cada operación de este
  sprint según el rol del usuario autenticado desde el servidor; ocultar
  opciones en la interfaz no es suficiente.
- **FR-022**: El sistema DEBE validar los datos de entrada (nombres,
  descripciones, series y repeticiones, fechas) y rechazar operaciones
  inválidas indicando el dato incorrecto, sin guardar el registro.
- **FR-023**: El sistema DEBE registrar en la auditoría los cambios
  relevantes: alta y modificación de entrenadores, creación y cierre de
  asignaciones, creación y modificación de rutinas y registro de objetivos y
  progresos.
- **FR-024**: El sistema DEBE confirmar el resultado de cada operación con un
  mensaje claro de éxito o error, sin revelar información técnica interna.
- **FR-025**: El sistema DEBE conservar toda la información del entrenamiento
  (asignaciones, rutinas, objetivos y progresos) cuando un entrenador o un
  cliente deja de estar activo, sin borrado físico, para sostener el
  historial y una eventual reasignación.
- **FR-026**: El sistema DEBE utilizar la información del entrenamiento
  únicamente para el seguimiento del cliente y el apoyo operativo del
  gimnasio, conforme al propósito definido para el sistema.

### Entidades clave *(incluye si la funcionalidad maneja datos)*

- **Entrenador**: perfil del personal de coaching del gimnasio. Registra
  nombre, datos de contacto, estado y la cuenta de usuario con la que opera;
  se relaciona con las asignaciones de clientes y con las rutinas que firma.
- **Asignación de entrenador a cliente**: relación de responsabilidad entre un
  entrenador y un cliente con fecha de inicio y fecha de fin. Un solo
  entrenador principal está activo por cliente; las asignaciones cerradas se
  conservan como historial.
- **Rutina**: plan de entrenamiento dirigido a un cliente y firmado por un
  entrenador. Contiene nombre, estado (activa o archivada), fecha y sus
  ejercicios; una sola rutina activa por cliente.
- **Ejercicio de rutina**: componente de una rutina con su nombre o
  descripción, series, repeticiones o instrucciones y su orden dentro del
  plan.
- **Objetivo de entrenamiento**: meta definida para un cliente con
  descripción, meta a alcanzar, fecha opcional y estado (en curso o
  cumplido); agrupa los progresos relacionados.
- **Progreso del cliente**: registro fechado de un avance del cliente con su
  medición y comentario; se conserva de forma histórica para comparar
  evolución.
- **Indicadores del dashboard**: cifras y resúmenes agregados derivados de
  clientes, membresías, pagos, accesos, entrenadores, rutinas y progresos;
  se presentan por periodo en una vista completa para el administrador y en un
  panel reducido con los datos de la propia carga para el entrenador, sin
  sustituir los módulos de detalle.

### Límites del alcance

- Quedan fuera de este sprint: clases masivas, sesiones grupales y control de
  asistencia a clases.
- Quedan fuera: reportes complejos de operación y exportación de archivos; el
  dashboard es una vista de resumen en pantalla.
- Quedan fuera: evaluaciones médicas, diagnósticos y notas clínicas; el
  progreso registra métricas deportivas y comentarios de entrenamiento.
- Quedan fuera: nómina, recursos humanos, inventario, ventas y mensajería o
  notificaciones a clientes.
- No se modifican los módulos de membresías, pagos y control de acceso, salvo
  su lectura para alimentar los indicadores del dashboard.
- No se definen límites de clientes por entrenador, turnos ni calendario de
  sesiones.
- No se agregan roles nuevos ni se amplían los permisos financieros del
  entrenador.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: Al cierre del sprint, el 100% de los escenarios de aceptación de
  las 7 historias de usuario pasan en pruebas funcionales.
- **SC-002**: Un administrador registra un entrenador y lo asigna a un cliente
  en menos de 2 minutos, sin ayuda de soporte técnico.
- **SC-003**: Un entrenador crea una rutina con al menos 3 ejercicios en menos
  de 3 minutos desde su cuenta.
- **SC-004**: En pruebas de seguridad, el 100% de los intentos de crear o
  modificar rutinas, objetivos o asignaciones fuera de la carga permitida del
  usuario son denegados; 0 operaciones no permitidas se completan.
- **SC-005**: El 100% de los clientes con rutina activa pueden consultarla
  desde su cuenta y 0 clientes obtienen información de otros clientes en las
  pruebas de aislamiento.
- **SC-006**: El administrador ve los indicadores del dashboard actualizados
  al abrir la vista, sin pasos adicionales, en menos de 3 segundos.
- **SC-007**: En una revisión de los datos expuestos, 0 usuarios sin permiso
  acceden al dashboard completo ni a indicadores fuera de su carga, y 0
  clientes acceden a rutinas y progresos ajenos.
- **SC-008**: El 100% de las reasignaciones de entrenador conservan la
  asignación anterior con su fecha de cierre; 0 historiales de asignación se
  pierden.
- **SC-009**: El 100% de los cambios relevantes del sprint (entrenadores,
  asignaciones, rutinas y progresos) quedan registrados en la auditoría con
  usuario, acción, fecha y resultado.
- **SC-010**: El 90% del personal probado completa sin ayuda el flujo de
  cierre: registrar entrenador → asignar cliente → crear rutina → registrar
  objetivo y progreso → consultar desde la cuenta del cliente → revisar el
  dashboard.

## Supuestos

- El alcance de este sprint está autorizado por el documento de insumo
  `docs/sprints/sprint-3.md`; al cierre del sprint, la documentación maestra
  (`project-context.md`, `reglas.md` y la constitución) DEBE sincronizarse
  para reflejar la tercera etapa de la base de datos y los permisos de
  escritura del entrenador, conforme a la regla de gobernanza que exige
  documentar cambios de alcance, roles y reglas de negocio.
- El sistema reutiliza la autenticación, los cuatro roles, la gestión de
  clientes, membresías, pagos, accesos y auditoría construidos en los sprints
  anteriores; este sprint no los modifica.
- Registrar un entrenador significa crear su perfil profesional asociado a una
  cuenta existente con rol de entrenador; se asume una relación de una cuenta
  de usuario por perfil de entrenador.
- La reasignación de un cliente a otro entrenador cierra automáticamente la
  asignación anterior con fecha de fin y conserva la nueva como vigente
  (decisión registrada en Clarifications, conforme a "un solo entrenador
  principal en el periodo activo de seguimiento" y a la exigencia de
  conservar el historial).
- Cada cliente tiene una sola rutina activa; crear una nueva rutina archiva la
  anterior de forma automática (decisión registrada en Clarifications). Las
  rutinas archivadas se conservan como historial.
- No existen operaciones de borrado físico en este módulo: los entrenadores,
  asignaciones, rutinas, ejercicios, objetivos y progresos se desactivan o
  archivan, en línea con la integridad del historial exigida al resto del
  sistema.
- Asignar un entrenador requiere un cliente con estado activo; no requiere
  membresía vigente, porque el seguimiento deportivo es independiente del
  control de acceso.
- El dashboard es completo para el administrador y el entrenador dispone de un
  panel propio reducido con los indicadores de su carga (decisión registrada
  en Clarifications); el recepcionista y el cliente no acceden a indicadores,
  y el filtrado por rol se cumple validando el permiso en el servidor para
  cada consulta.
- Los indicadores del dashboard son la unión de los definidos en el contexto
  del proyecto (clientes, membresías, ingresos, accesos) y los agregados de
  este sprint (entrenadores, rutinas, objetivos y progresos); el periodo por
  defecto es el mes en curso y se podrán ver últimos 30 días e histórico.
- El recepcionista consulta el personal y las asignaciones (carga de trabajo)
  y ve las rutinas en solo lectura; no accede al dashboard, no edita rutinas ni
  objetivos y no consulta ni edita progresos (decisión registrada en
  Clarifications).
- Los "progresos médicos o deportivos" citados para la restricción del
  recepcionista se interpretan como métricas deportivas y comentarios de
  entrenamiento, sin datos médicos diagnósticos.
- Si un entrenador deja de estar activo, su carga puede cerrarse y
  reasignarse; sus rutinas y progresos se conservan para el nuevo responsable
  o para consulta histórica.
- No se define un máximo de clientes por entrenador ni un calendario de
  sesiones en este sprint.
- La baja de un cliente (estado inactivo) no elimina su información de
  entrenamiento, en consonancia con la baja de cliente del sprint anterior.
