# Especificación de la funcionalidad: Membresías, pagos, reconocimiento facial y control de acceso (Sprint 2)

**Feature Branch**: `002-sprint2-membresias-pagos-acceso-facial`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "Usa la descripción de @docs/sprints/sprint-2.md" (fuente: `docs/sprints/sprint-2.md`)

## Clarifications

### Session 2026-10-14

- Q: ¿Qué métodos de pago debe aceptar el sistema para registrar un pago? → A: Solo efectivo (único método del catálogo en este sprint).
- Q: Cuando un administrador reactiva una membresía suspendida, ¿cómo se calcula la fecha de finalización? → A: No se modifica: conserva su fecha de finalización original y los días de suspensión no se recuperan.
- Q: ¿Qué debe ocurrir con la información facial de un cliente cuando se da de baja o pasa a estado inactivo? → A: Se elimina al darse de baja; si el cliente se reactiva, se captura de nuevo.
- Q: ¿Se debe impedir asignar o renovar una membresía a un cliente que todavía tiene adeudos pendientes? → A: Sí, se bloquea la asignación o renovación hasta que el adeudo quede saldado.
- Q: ¿Debe el cliente poder consultar el estado y las fechas de su propia membresía desde su cuenta? → A: Sí, consulta de solo lectura con estado y fechas de su membresía (además de pagos y accesos ya definidos).

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Registro y administración de tipos de membresía (Prioridad: P1)

Como administrador, quiero registrar y administrar los tipos de membresía con
su nombre, descripción, duración y precio, para definir los planes disponibles
que se asignarán a los clientes.

**Por qué esta prioridad**: Sin tipos de membresía no es posible asignar una
membresía, calcular un pago ni validar un acceso; es la base sobre la que se
construye todo lo demás del sprint.

**Prueba independiente**: Puede probarse de forma independiente registrando un
tipo de membresía válido desde la cuenta administradora, verificando que aparezca
en la consulta y que pueda usarse para asignar una membresía a un cliente.

**Escenarios de aceptación**:

1. **Dado** una sesión de administrador, **Cuando** registra un tipo de
   membresía con nombre, duración y precio válidos, **Entonces** el tipo queda
   creado y disponible para asignar membresías.
2. **Dado** una sesión de administrador, **Cuando** intenta guardar un tipo de
   membresía sin nombre o con duración o precio inválidos, **Entonces** el
   sistema rechaza la operación, indica qué dato es incorrecto y no guarda el
   registro.
3. **Dado** un tipo de membresía existente, **Cuando** el administrador modifica
   su nombre, descripción, duración o precio, **Entonces** los cambios quedan
   guardados y las membresías ya asignadas conservan sus fechas y su importe
   originales.
4. **Dado** una sesión de un rol sin permiso (por ejemplo, recepcionista,
   entrenador o cliente), **Cuando** intenta crear o modificar tipos de
   membresía, **Entonces** el sistema deniega la operación.
5. **Dado** una sesión de administrador, **Cuando** consulta los tipos de
   membresía, **Entonces** ve los planes registrados con su nombre, duración,
   precio y estado.

---

### Historia de usuario 2 - Asignación de membresía a un cliente (Prioridad: P1)

Como administrador o recepcionista, quiero asignar una membresía a un cliente
para registrar su periodo de acceso al gimnasio.

**Por qué esta prioridad**: Convierte el plan en un acceso real para el
cliente; los pagos y el control de acceso dependen de que exista una membresía
asignada.

**Prueba independiente**: Puede probarse de forma independiente asignando una
membresía a un cliente ya registrado desde una cuenta de administrador o
recepcionista y verificando que las fechas y el estado queden guardados.

**Escenarios de aceptación**:

1. **Dado** un cliente registrado y un tipo de membresía disponible, **Cuando**
   un administrador o recepcionista asigna la membresía indicando una fecha de
   inicio, **Entonces** el sistema crea la membresía con fecha de inicio, fecha
   de finalización calculada según la duración del tipo y estado inicial
   activa.
2. **Dado** un cliente que no existe en el sistema, **Cuando** se intenta
   asignarle una membresía, **Entonces** el sistema rechaza la operación.
3. **Dado** un cliente que ya cuenta con una membresía activa, **Cuando** se
   intenta asignarle una segunda membresía, **Entonces** el sistema rechaza la
   operación e indica que el cliente ya tiene una membresía activa.
4. **Dado** una sesión de un rol sin permiso (entrenador o cliente), **Cuando**
   intenta asignar una membresía, **Entonces** el sistema deniega la
   operación.
5. **Dado** una membresía asignada, **Cuando** un usuario autorizado la
   consulta, **Entonces** se muestran el cliente, el tipo de membresía, las
   fechas de inicio y finalización y el estado.
6. **Dado** un cliente en estado inactivo, **Cuando** se intenta asignarle una
   membresía, **Entonces** el sistema rechaza la operación e indica que el
   cliente no está activo.
7. **Dado** un cliente con un adeudo pendiente de una membresía anterior,
   **Cuando** se intenta asignarle una nueva membresía, **Entonces** el sistema
   rechaza la operación e indica que primero debe saldarse el adeudo.

---

### Historia de usuario 3 - Registro de pagos (Prioridad: P1)

Como administrador o recepcionista, quiero registrar los pagos realizados por
los clientes para mantener un historial financiero del gimnasio.

**Por qué esta prioridad**: El ingreso por membresías es la operación financiera
más frecuente del gimnasio y alimenta la consulta de adeudos; depende de que
existan clientes y membresías.

**Prueba independiente**: Puede probarse de forma independiente registrando un
pago válido contra la membresía de un cliente y verificando que quede asociado
al cliente y a la membresía en el historial.

**Escenarios de aceptación**:

1. **Dado** un cliente con una membresía, **Cuando** un administrador o
   recepcionista registra un pago con monto, fecha y método válidos,
   **Entonces** el pago queda asociado al cliente y a la membresía
   correspondiente.
2. **Dado** un monto menor o igual a cero, **Cuando** se intenta guardar el
   pago, **Entonces** el sistema rechaza la operación e indica que el monto no
   es válido.
3. **Dado** un pago registrado, **Cuando** se consulta el historial de pagos,
   **Entonces** el pago aparece con su cliente, membresía, monto, fecha y
   método de pago.
4. **Dado** un pago registrado, **Cuando** cualquier usuario intenta eliminarlo
   o modificarlo desde las funciones disponibles, **Entonces** el sistema no
   permite la eliminación ordinaria del registro histórico.
5. **Dado** un pago parcial, **Cuando** se consulta el estado de la membresía,
   **Entonces** el sistema muestra el saldo pendiente calculado como la
   diferencia entre el precio de la membresía y la suma de los pagos
   registrados contra ella.
6. **Dado** un pago registrado con un monto mayor al saldo pendiente,
   **Cuando** se consulta el adeudo, **Entonces** el sistema muestra el saldo
   en cero y el pago completo permanece en el historial.

---

### Historia de usuario 4 - Renovación de membresía (Prioridad: P2)

Como administrador o recepcionista, quiero renovar la membresía de un cliente
para mantener actualizado su periodo de acceso al gimnasio.

**Por qué esta prioridad**: Es la continuación natural de la membresía y
mantienen el control de acceso vigente, pero depende de que existan membresías
asignadas.

**Prueba independiente**: Puede probarse de forma independiente renovando una
membresía activa o vencida y verificando que la nueva fecha de finalización
quede guardada y que la membresía resulte utilizable para autorizar accesos.

**Escenarios de aceptación**:

1. **Dado** un cliente con una membresía activa o vencida, **Cuando** un
   administrador o recepcionista la renueva, **Entonces** la fecha de
   finalización se extiende a partir de la fecha de finalización vigente y la
   membresía queda en estado activa.
2. **Dado** una membresía suspendida o cancelada, **Cuando** se intenta
   renovarla, **Entonces** el sistema rechaza la operación e indica que el
   estado de la membresía no permite la renovación.
3. **Dado** una renovación registrada, **Cuando** se consulta la membresía,
   **Entonces** se muestra la nueva fecha de finalización junto con sus datos.
4. **Dado** una sesión de un rol sin permiso, **Cuando** intenta renovar una
   membresía, **Entonces** el sistema deniega la operación.
5. **Dado** una membresía con adeudo pendiente, **Cuando** se intenta
   renovarla, **Entonces** el sistema rechaza la operación e indica que
   primero debe saldarse el adeudo.

---

### Historia de usuario 5 - Registro de información facial (Prioridad: P2)

Como administrador o recepcionista autorizado, quiero registrar la información
facial de un cliente para permitir su identificación al ingresar al gimnasio.

**Por qué esta prioridad**: Es el prerequisite del reconocimiento facial y del
control de acceso; no funciona sin clientes y su información debe quedar lista
antes de usarla en el acceso.

**Prueba independiente**: Puede probarse de forma independiente registrando la
información facial de un cliente ya registrado y verificando que el sistema
pueda usarla posteriormente para identificarlo.

**Escenarios de aceptación**:

1. **Dado** un cliente registrado sin información facial, **Cuando** un usuario
   autorizado registra su información facial mediante la captura correspondiente,
   **Entonces** la información queda asociada al cliente y puede utilizarse para
   identificarlo.
2. **Dado** un cliente que ya tiene información facial registrada, **Cuando** se
   registra nuevamente, **Entonces** la información anterior queda reemplazada
   por la nueva y el cliente sigue siendo identificable.
3. **Dado** un rostro que no pertenece a un cliente registrado, **Cuando** se
   intenta registrar información facial, **Entonces** el sistema rechaza la
   operación e indica que el cliente debe existir previamente en el sistema.
4. **Dado** una sesión de un rol sin permiso, **Cuando** intenta registrar
   información facial, **Entonces** el sistema deniega la operación.
5. **Dado** un cliente con información facial registrada, **Cuando** un usuario
   autorizado consulta su ficha, **Entonces** el sistema indica que cuenta con
   información facial sin exponer los datos biométricos.
6. **Dado** un cliente con información facial registrada, **Cuando** el cliente
   se da de baja o pasa a estado inactivo, **Entonces** la información facial
   se elimina y, si el cliente se reactiva, deberá capturarse de nuevo antes de
   poder identificarlo en el punto de acceso.

---

### Historia de usuario 6 - Identificación facial y control de acceso (Prioridad: P2)

Como cliente previamente registrado, quiero identificarme con mi rostro al
ingresar al gimnasio, para que el sistema verifique mi identidad, valide mi
membresía y autorice o rechace mi entrada.

**Por qué esta prioridad**: Es el flujo central del sprint: une el
reconocimiento facial con la vigencia de la membresía. Tiene sentido una vez
que existen clientes, membresías y datos faciales registrados.

**Prueba independiente**: Puede probarse de forma independiente capturando el
rostro de un cliente con membresía vigente y verificando que el acceso quede
autorizado y registrado, y repitiendo con una membresía vencida para verificar
el rechazo con motivo.

**Escenarios de aceptación**:

1. **Dado** un cliente con información facial registrada y una membresía activa
   y vigente, **Cuando** su rostro se captura en el punto de acceso,
   **Entonces** el sistema lo identifica, verifica su membresía, autoriza el
   acceso y registra el intento como autorizado.
2. **Dado** un cliente identificado con una membresía vencida, **Cuando** se
   captura su rostro, **Entonces** el sistema rechaza el acceso, muestra un
   mensaje claro con el motivo y registra el intento como rechazado con ese
   motivo.
3. **Dado** un cliente identificado con una membresía suspendida o cancelada,
   **Cuando** se captura su rostro, **Entonces** el sistema rechaza el acceso y
   registra el intento como rechazado con el motivo correspondiente.
4. **Dado** un cliente identificado sin ninguna membresía registrada,
   **Cuando** se captura su rostro, **Entonces** el sistema rechaza el acceso
   por no contar con una membresía vigente y registra el intento.
5. **Dado** un rostro que no coincide con ningún cliente registrado, **Cuando**
   se captura en el punto de acceso, **Entonces** el sistema no autoriza el
   acceso, informa que no fue posible identificar al cliente, registra el
   intento como rechazado con el motivo correspondiente y no revela información
   de los clientes del gimnasio.
6. **Dado** cualquier intento de acceso, sea autorizado o rechazado,
   **Entonces** queda registrado con su fecha, hora, resultado y, cuando
   corresponda, el motivo de rechazo; esos registros no se eliminan de manera
   ordinaria.
7. **Dado** que la identificación facial ocurre antes de la validación de la
   membresía, **Cuando** no existe una coincidencia facial válida,
   **Entonces** el sistema no muestra ni consulta información de membresía de
   ningún cliente.

---

### Historia de usuario 7 - Consulta de pagos y adeudos (Prioridad: P3)

Como administrador, quiero consultar el historial de pagos y los adeudos de los
clientes para llevar el control financiero del gimnasio.

**Por qué esta prioridad**: Es una función de consulta y análisis que depende
de que existan pagos registrados; el cliente también puede revisar sus propios
pagos y adeudos como parte de esta misma información.

**Prueba independiente**: Puede probarse de forma independiente registrando
pagos para varios clientes y verificando que la consulta de historial y adeudos
refleje correctamente los saldos.

**Escenarios de aceptación**:

1. **Dado** una sesión de administrador, **Cuando** consulta el historial de
   pagos, **Entonces** ve los pagos registrados con su cliente, membresía,
   monto, fecha y método.
2. **Dado** clientes con saldo pendiente, **Cuando** el administrador consulta
   los adeudos, **Entonces** el sistema muestra cada cliente con deuda y el
   monto pendiente por membresía.
3. **Dado** una sesión de cliente, **Cuando** consulta sus pagos y sus
   adeudos, **Entonces** ve únicamente su propia información.
4. **Dado** una sesión de un rol sin permiso sobre información financiera
   (por ejemplo, entrenador), **Cuando** intenta consultar pagos o adeudos de
   clientes, **Entonces** el sistema deniega el acceso.

---

### Historia de usuario 8 - Consulta de registros de acceso (Prioridad: P3)

Como administrador o recepcionista, quiero consultar los registros de acceso
para conocer las entradas autorizadas y los intentos rechazados.

**Por qué esta prioridad**: Es la función de revisión del control de acceso;
depende de que ya existan intentos de acceso registrados por el sistema.

**Prueba independiente**: Puede probarse de forma independiente realizando
accesos autorizados y rechazados y verificando que aparezcan en la consulta con
su resultado y motivo.

**Escenarios de aceptación**:

1. **Dado** una sesión de administrador o recepcionista, **Cuando** consulta los
   registros de acceso, **Entonces** ve los intentos con su fecha, hora, cliente
   identificado cuando lo hubiera, resultado y motivo de rechazo.
2. **Dado** una sesión de entrenador, **Cuando** consulta los accesos,
   **Entonces** ve la información de asistencia que corresponde a su rol, sin
   datos financieros.
3. **Dado** una sesión de cliente, **Cuando** consulta su historial de accesos,
   **Entonces** ve únicamente sus propios registros.
4. **Dado** registros de acceso existentes, **Cuando** el usuario filtra por
   fecha o por resultado (autorizado o rechazado), **Entonces** el sistema
   muestra los accesos coincidentes; si no hay coincidencias, lo indica de
   forma clara.

---

### Historia de usuario 9 - Consulta de la membresía propia por el cliente (Prioridad: P3)

Como cliente, quiero consultar el estado y las fechas de mi membresía para
saber hasta cuándo tengo acceso al gimnasio.

**Por qué esta prioridad**: es una consulta de solo lectura sobre información
que ya existe; la constitución la exige para el rol cliente y complementa la
consulta de pagos y accesos que ya forman parte del sprint.

**Prueba independiente**: Puede probarse de forma independiente iniciando
sesión como cliente con una membresía activa y verificando que se muestren el
estado y las fechas, y repitiendo con una membresía vencida para comprobar que
el estado se muestra como vencida.

**Escenarios de aceptación**:

1. **Dado** un cliente con una membresía, **Cuando** inicia sesión en su
   cuenta, **Entonces** ve su membresía con el tipo, la fecha de inicio, la
   fecha de finalización y el estado.
2. **Dado** un cliente con una membresía vencida, **Cuando** consulta su
   membresía, **Entonces** el estado se muestra como vencida y no se autoriza
   el acceso por ello.
3. **Dado** una sesión de cliente, **Cuando** intenta consultar la membresía
   de otro cliente, **Entonces** el sistema deniega el acceso y no muestra
   esa información.

---

### Casos límite

- ¿Qué sucede cuando un cliente intenta ingresar el mismo día en que su
  membresía cumple su fecha de finalización? → La membresía se considera
  vigente durante toda la fecha de finalización; vence a partir del día
  siguiente.
- ¿Qué sucede cuando un cliente con membresía vencida intenta ingresar? → El
  acceso se rechaza con el motivo "membresía vencida" y el intento queda
  registrado; no existe tiempo de tolerancia.
- ¿Qué sucede cuando un rostro no coincide con ningún cliente registrado? → El
  acceso se rechaza, se informa que no fue posible identificar al cliente sin
  revelar datos internos y el intento queda registrado como rechazado.
- ¿Qué sucede cuando el mismo cliente falla repetidamente en el
  reconocimiento? → Cada intento queda registrado como rechazado con su
  motivo; el sistema no bloquea de forma permanente al cliente y el personal
  puede atenderlo conforme a las políticas del gimnasio.
- ¿Qué sucede cuando la cámara no está disponible o la captura no permite
  identificar al cliente (permiso denegado, iluminación deficiente)? → El
  sistema informa que no fue posible completar la identificación, registra el
  intento como rechazado y no muestra errores técnicos internos.
- ¿Qué sucede cuando dos personas con rasgos similares se presentan? → El
  sistema aplica el umbral de coincidencia que se defina en la etapa de
  planificación; si la coincidencia no supera el umbral, el acceso se
  rechaza.
- ¿Qué sucede cuando se intenta renovar una membresía antes de que termine? →
  La nueva vigencia se suma a partir de la fecha de finalización actual, nunca
  se recorta ni se pisa el periodo pendiente.
- ¿Qué sucede cuando se registra un pago mayor al saldo pendiente? → El pago
  completo queda en el historial y el adeudo de la membresía se muestra en
  cero.
- ¿Qué sucede cuando se intenta registrar un pago sin membresía asociada? →
  El sistema rechaza la operación, porque todo pago debe relacionarse con un
  cliente y su membresía correspondiente.
- ¿Qué sucede cuando se intenta asignar una membresía a un cliente inactivo? →
  El sistema rechaza la operación e indica que el cliente no está activo.
- ¿Qué sucede cuando un cliente tiene un adeudo pendiente y quiere una
  membresía nueva o renovar la actual? → El sistema rechaza la operación e
  indica que primero debe saldarse el adeudo; recepcionista registra el pago
  contra la membresía original y, una vez sin adeudo, la asignación o
  renovación procede con normalidad.
- ¿Qué sucede cuando se suspende una membresía y el cliente paga su
  renovación? → El pago queda registrado, pero la membresía solo vuelve a
  estar activa cuando un administrador la reactiva.
- ¿Qué sucede cuando se reactiva una membresía suspendida? → La membresía
  conserva su fecha de finalización original: los días transcurridos en
  suspensión no se recuperan ni se suma tiempo adicional.
- ¿Qué sucede cuando se registra información facial de un cliente cuya
  membresía está vencida? → El registro facial se permite, porque no depende
  de la membresía; el acceso se rechazará de todos modos hasta que la
  membresía esté vigente.
- ¿Qué sucede cuando la consulta de pagos, adeudos o accesos no devuelve
  resultados? → El sistema lo indica de forma clara, sin mostrarlo como un
  error técnico.
- ¿Qué sucede cuando un rol intenta una operación fuera de sus permisos desde
  la interfaz? → El sistema la bloquea y no expone los datos, incluso si la
  opción no estaba oculta.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **FR-001**: El sistema DEBE permitir al administrador registrar tipos de
  membresía con nombre, descripción, duración y precio, rechazando datos
  obligatorios faltantes o inválidos con un mensaje claro.
- **FR-002**: El sistema DEBE permitir al administrador consultar y modificar
  los tipos de membresía; las modificaciones no DEBEN alterar las membresías
  ya asignadas, que conservan sus fechas y su importe originales.
- **FR-003**: El sistema DEBE permitir a administrador y recepcionista asignar
  una membresía a un cliente existente y activo, registrando fecha de inicio y
  fecha de finalización calculada a partir de la duración del tipo, con estado
  inicial activa.
- **FR-004**: El sistema DEBE permitir una única membresía activa por cliente;
  si el cliente ya tiene una membresía activa, la nueva asignación DEBE ser
  rechazada con un mensaje claro.
- **FR-005**: El sistema DEBE permitir a administrador y recepcionista renovar
  una membresía activa o vencida, extendiendo la fecha de finalización a partir
  de la fecha de finalización vigente y dejando la membresía en estado activa;
  las membresías suspendidas o canceladas NO DEBEN poder renovarse.
- **FR-006**: El sistema DEBE identificar y mostrar el estado de cada membresía
  (activa, vencida, suspendida o cancelada), determinando la vigencia por
  fechas: la membresía es vigente durante su fecha de finalización inclusive y
  vence a partir del día siguiente.
- **FR-007**: El sistema DEBE permitir a administrador y recepcionista
  registrar pagos con monto positivo, fecha y método de pago, aceptando como
  único método el efectivo, asociando cada
  pago a un cliente y a una membresía existente; los pagos sin membresía
  asociada DEBEN ser rechazados.
- **FR-008**: El sistema NO DEBE permitir la eliminación ordinaria de los
  registros de pagos; el historial financiero DEBE conservarse.
- **FR-009**: El sistema DEBE calcular y mostrar el saldo pendiente de una
  membresía como la diferencia entre el precio de su tipo y la suma de los
  pagos registrados contra esa membresía, sin permitir saldos negativos.
- **FR-010**: El sistema DEBE permitir al administrador consultar el historial
  completo de pagos y los adeudos por cliente; el cliente DEBE poder consultar
  únicamente sus propios pagos y adeudos.
- **FR-011**: El sistema DEBE permitir registrar información facial
  únicamente de clientes previamente registrados; si el cliente ya cuenta con
  información facial, el nuevo registro DEBE reemplazar al anterior.
- **FR-012**: El sistema DEBE permitir identificar a un cliente mediante su
  rostro en el punto de acceso, y la identificación facial DEBE realizarse
  antes de validar la membresía.
- **FR-013**: El sistema DEBE autorizar el acceso únicamente cuando exista una
  coincidencia facial válida y el cliente identificado cuente con una
  membresía activa y vigente; la coincidencia facial por sí sola NO DEBE
  autorizar el ingreso.
- **FR-014**: El sistema DEBE rechazar el acceso cuando la membresía esté
  vencida, suspendida, cancelada o no exista, o cuando el rostro no pueda ser
  identificado, indicando siempre un motivo claro de rechazo al usuario.
- **FR-015**: El sistema DEBE registrar todo intento de acceso, autorizado o
  rechazado, con su fecha, hora y resultado; los rechazos DEBEN incluir el
  motivo y los registros de acceso NO DEBEN eliminarse de manera ordinaria.
- **FR-016**: El sistema DEBE validar los permisos de cada operación según el
  rol del usuario en la lógica del sistema, y no únicamente ocultando opciones
  en la interfaz: tipos de membresía y auditoría son exclusivas del
  administrador; asignar, renovar membresías y registrar pagos e información
  facial corresponden a administrador y recepcionista; la consulta de pagos y
  adeudos corresponde al administrador y al propio cliente.
- **FR-017**: El sistema DEBE tratar la información facial únicamente para
  identificación y control de acceso, DEBE mantenerla protegida y NO DEBE
  exponerla a usuarios sin permiso ni utilizarla para vigilancia, seguimiento o
  identificación de personas que no sean clientes registrados.
- **FR-018**: El sistema DEBE validar los datos de entrada (fechas, montos,
  identificadores) antes de procesarlos, impidiendo guardar registros
  inválidos e indicando al usuario cuál dato es incorrecto.
- **FR-019**: El sistema DEBE confirmar el resultado de cada operación con un
  mensaje claro de éxito o error, sin revelar información técnica interna.
- **FR-020**: El sistema DEBE registrar acciones críticas en la auditoría del
  sistema (asignación y renovación de membresías, pagos, registro de
  información facial y accesos autorizados o rechazados), y la consulta de
  auditoría DEBE ser exclusiva del administrador.
- **FR-021**: El sistema DEBE permitir al entrenador consultar clientes, el
  estado de sus membresías y la información de asistencia o accesos que le
  corresponde, sin acceso a información financiera.
- **FR-022**: El sistema DEBE eliminar la información facial de un cliente
  cuando este se dé de baja o pase a estado inactivo; una reactivación
  posterior DEBE exigir una nueva captura antes de volver a identificarlo en
  el punto de acceso.
- **FR-023**: El sistema DEBE impedir asignar o renovar una membresía a un
  cliente que tenga un adeudo pendiente de cualquier membresía anterior,
  indicando que el adeudo debe saldarse primero; el pago correspondiente DEBE
  poder registrarse contra la membresía original para desbloquear la
  operación.
- **FR-024**: El sistema DEBE permitir al cliente consultar en modo solo
  lectura su propia membresía (tipo, fecha de inicio, fecha de finalización y
  estado), impidiendo consultar membresías de otros clientes.

### Entidades clave *(incluye si la funcionalidad maneja datos)*

- **Tipo de membresía**: plan disponible del gimnasio. Atributos: nombre,
  descripción, duración, precio, estado. Relaciones: define las membresías
  asignadas; los cambios en el plan no afectan membresías ya asignadas.
- **Membresía**: vínculo entre un cliente y un tipo de membresía durante un
  periodo. Atributos: cliente, tipo, fecha de inicio, fecha de finalización,
  estado (activa, vencida, suspendida, cancelada). Relaciones: pertenece a un
  cliente, usa un tipo de membresía y agrupa sus pagos.
- **Pago**: registro financiero de un cobro. Atributos: cliente, membresía,
  monto, fecha, método de pago. Relaciones: pertenece a un cliente y a una
  membresía; el conjunto de pagos de una membresía determina su saldo
  pendiente. No se elimina de manera ordinaria.
- **Rostro (información facial)**: dato necesario para identificar a un
  cliente. Atributos: cliente, información de identificación facial,
  fecha de registro, estado. Relaciones: uno por cliente; reemplaza al
  registrarse de nuevo. Se trata como información sensible y no se expone, y
  se elimina cuando el cliente se da de baja o pasa a estado inactivo.
- **Acceso**: intento de entrada al gimnasio. Atributos: cliente (cuando pudo
  identificarse), fecha, hora, resultado (autorizado o rechazado), motivo de
  rechazo. Relaciones: corresponde a un cliente identificado. No se elimina de
  manera ordinaria.
- **Auditoría**: registro de acciones críticas. Atributos: usuario que realizó
  la acción, acción, módulo, fecha, resultado, descripción. Relaciones: asociada
  al usuario que ejecutó la acción; su consulta es exclusiva del
  administrador.

### Límites del alcance

- **Dentro del alcance**: tipos de membresía (crear, consultar, modificar),
  asignación y renovación de membresías, registro de pagos, consulta de pagos y
  adeudos, consulta de la membresía propia por parte del cliente, registro de
  información facial, identificación mediante
  reconocimiento facial, validación de acceso según vigencia, registro y
  consulta de accesos y registro de auditoría de las acciones críticas del
  sprint.
- **Fuera del alcance**: dashboard avanzado, reportes avanzados, aplicación
  móvil, gestión de múltiples sucursales, nómina, inventario, contabilidad
  completa, facturación electrónica, procesamiento directo de pagos con bancos
  o plataformas externas, vigilancia mediante reconocimiento facial,
  seguimiento o rastreo facial de clientes, identificación facial de personas
  no registradas con fines distintos al acceso, reconocimiento facial fuera del
  punto de acceso definido y cualquier función ajena al MVP de
  `docs/project-context.md`.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: Al cierre del sprint, el 100% de los escenarios de aceptación
  definidos en esta especificación pasan en la demostración.
- **SC-002**: Un administrador registra un tipo de membresía válido en menos
  de 2 minutos.
- **SC-003**: Un administrador o recepcionista asigna una membresía a un
  cliente y registra su pago en menos de 3 minutos.
- **SC-004**: En pruebas de control de acceso, el 100% de los clientes con
  membresía activa y vigente son autorizados, y el 100% de los clientes con
  membresía vencida, suspendida, cancelada o inexistente son rechazados con su
  motivo registrado.
- **SC-005**: El 100% de los intentos de acceso realizados durante las pruebas
  quedan registrados con su resultado, y el 100% de los rechazos incluyen el
  motivo.
- **SC-006**: En pruebas de seguridad, 0 accesos son autorizados por una
  coincidencia facial sin una membresía vigente asociada, y 0 intentos no
  identificados muestran información de clientes.
- **SC-007**: El sistema identifica o rechaza a un cliente en menos de 5
  segundos desde la captura del rostro en las condiciones del punto de acceso.
- **SC-008**: En una revisión de los datos expuestos, 0 usuarios sin permiso
  pueden consultar información facial de clientes ni datos financieros ajenos.
- **SC-009**: El 90% del personal probado completa sin ayuda el flujo completo
  (cliente → membresía → pago → registro facial → acceso autorizado y
  rechazado) en su primer intento.

## Supuestos

- La base del sistema (usuarios, roles, clientes y autenticación) existe desde
  el Sprint 1 y será reutilizada tal cual; hay una cuenta administradora
  inicial sembrada.
- Cada cliente puede tener una sola membresía activa a la vez; para tener una
  nueva, la anterior debe terminar, suspenderse o cancelarse.
- La vigencia de una membresía es inclusiva: está activa desde su fecha de
  inicio hasta su fecha de finalización completa, y vence a partir del día
  siguiente; no se aplica tiempo de tolerancia tras el vencimiento (regla RN-07
  y RN-08 de la constitución).
- Renovar una membresía suma el nuevo periodo a partir de la fecha de
  finalización vigente, incluso si se renueva antes de que termine.
- Se permiten pagos parciales contra una membresía; el adeudo se calcula como
  la diferencia entre el precio del tipo de membresía y la suma de los pagos
  registrados contra esa membresía.
- El catálogo de métodos de pago se limita a **efectivo** durante este sprint;
  no se admite otro método y el campo método siempre queda en ese valor (se
  decidió en `/speckit.clarify`, sesión 2026-10-14).
- Solo el administrador puede suspender, cancelar y reactivar membresías; una
  membresía suspendida o cancelada no autoriza accesos y requiere reactivación
  (cuando aplique) antes de volver a estar activa. Al reactivarla conserva su
  fecha de finalización original, sin recuperar los días de suspensión.
- La información facial se almacena únicamente en la forma necesaria para
  identificar al cliente; la tecnología exacta, el formato del dato facial y su
  protección se definirán en la investigación y planificación del sprint
  (`/speckit.plan`), donde la librería de reconocimiento facial deberá
  seleccionarse y justificarse antes de implementarse.
- El reconocimiento facial se usa solo en el punto de acceso y el registro
  facial, con la información proporcionada por los clientes registrados; no
  constituye vigilancia ni seguimiento.
- El umbral de coincidencia facial, las condiciones mínimas de iluminación y la
  cámara para las pruebas se definen durante la planificación y las pruebas
  del sprint; la especificación solo exige que un acceso requiera una
  coincidencia válida.
- Cuando el reconocimiento facial no logra identificar al cliente, el acceso se
  rechaza y el personal atiende al cliente conforme a las políticas del
  gimnasio, fuera del alcance del sistema.
- El sprint incorpora auditoría funcional mínima sobre las acciones críticas
  descritas en FR-020; un módulo de auditoría más amplio queda para sprintes
  posteriores.
- Las decisiones técnicas pendientes (librería de reconocimiento facial,
  manejo de estado, diseño de la API y demás listadas en
  `docs/project-context.md` y en la sección 9 del insumo del sprint) se
  resolverán en `/speckit.clarify` y la planificación, no en esta
  especificación.
