# Feature Specification: Base del sistema, usuarios y clientes (Sprint 1)

**Feature Branch**: `001-sprint1-auth-clientes`

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "Usa la descripción de @docs/sprints/sprint-1.md" (fuente: `docs/sprints/sprint-1.md`)

## Clarifications

### Session 2026-10-08

- Q: ¿Qué política de contraseña mínima debe exigir el sistema para crear o modificar cuentas de usuario? → A: Mínimo 8 caracteres, al menos una mayúscula y un número.
- Q: ¿Qué información concreta de un cliente debe poder ver el entrenador al consultar la lista de clientes? → A: Nombre completo y datos de contacto (teléfono/correo).
- Q: ¿Qué debe hacer el sistema tras varios intentos fallidos de inicio de sesión con la misma cuenta? → A: Bloquear la cuenta 15 minutos tras 5 intentos fallidos.
- Q: ¿Cómo debe manejar el sistema el registro de un cliente cuyos datos ya existen en la base de clientes? → A: Avisar si coincide nombre con teléfono o correo y pedir confirmación para guardar.
- Q: ¿Tras cuánto tiempo de inactividad debe expirar la sesión de un usuario y obligarlo a iniciar sesión de nuevo? → A: 8 horas de inactividad.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inicio de sesión y acceso según rol (Priority: P1)

Como usuario registrado, quiero iniciar sesión con mi correo y contraseña para
acceder a las funciones permitidas según mi rol.

**Why this priority**: Sin inicio de sesión no existe una forma segura de entrar
al sistema; es la puerta de entrada de todos los demás roles y la base para
hacer valer los permisos de cada usuario.

**Independent Test**: Puede probarse de forma independiente iniciando sesión con
credenciales válidas de un usuario ya registrado y verificando que solo se
muestren las funciones propias de su rol.

**Acceptance Scenarios**:

1. **Given** un usuario registrado con credenciales válidas, **When** ingresa su
   correo y contraseña correctos, **Then** el sistema lo autentica y muestra
   únicamente las funciones permitidas para su rol.
2. **Given** un usuario registrado, **When** ingresa credenciales incorrectas,
   **Then** el sistema muestra un mensaje de error claro sin revelar información
   interna del sistema.
3. **Given** un usuario sin sesión activa, **When** intenta acceder a una
   función protegida, **Then** el sistema le solicita iniciar sesión.
4. **Given** un usuario autenticado con un rol, **When** intenta usar una
   función reservada a otro rol, **Then** el sistema deniega el acceso y no
   muestra los datos de esa función.
5. **Given** un usuario autenticado, **When** su sesión expira por inactividad,
   **Then** el sistema lo devuelve al inicio de sesión y la operación en curso
   no queda registrada a medias.
6. **Given** una cuenta con 5 intentos fallidos consecutivos, **When** se
   intenta iniciar sesión de nuevo, **Then** el sistema rechaza el acceso
   durante 15 minutos con un mensaje claro que no revela si la cuenta existe.

---

### User Story 2 - Registro y administración de usuarios y roles (Priority: P2)

Como administrador, quiero registrar nuevos usuarios del sistema y asignarles un
rol para que el personal autorizado pueda utilizar la plataforma con las
funciones que le corresponden.

**Why this priority**: El administrador es quien habilita el acceso de todo el
personal; sin esta función no pueden existir los usuarios de los demás roles.

**Independent Test**: Puede probarse de forma independiente registrando un nuevo
usuario con un rol desde la cuenta administradora y verificando que ese usuario
puede iniciar sesión y que sus permisos coinciden con el rol asignado.

**Acceptance Scenarios**:

1. **Given** una sesión de administrador, **When** registra un usuario con datos
   válidos y un rol, **Then** el usuario queda creado y puede iniciar sesión.
2. **Given** una sesión de administrador, **When** intenta registrar un usuario
   con un correo ya existente o con datos incompletos, **Then** el sistema
   rechaza la operación con un mensaje claro y no guarda el registro.
3. **Given** una sesión de administrador, **When** modifica los datos o el rol de
   un usuario existente, **Then** los cambios se aplican y el usuario pasa a
   tener las funciones del nuevo rol.
4. **Given** una sesión de un usuario que no es administrador, **When** intenta
   registrar o modificar usuarios, **Then** el sistema deniega la operación.
5. **Given** una sesión de administrador, **When** consulta la lista de usuarios,
   **Then** ve los usuarios registrados con su rol actual.

---

### User Story 3 - Registro y modificación de clientes (Priority: P2)

Como administrador o recepcionista, quiero registrar y actualizar la
información de los clientes para mantener sus datos al día en el sistema.

**Why this priority**: La información de clientes es el dato central del
gimnasio; los demás roles y las futuras funcionalidades dependen de ella.

**Independent Test**: Puede probarse de forma independiente creando un cliente
con datos válidos desde una cuenta de administrador o recepcionista y
modificándolo después, verificando que los cambios queden guardados.

**Acceptance Scenarios**:

1. **Given** una sesión de administrador o recepcionista, **When** registra un
   cliente con datos válidos, **Then** el cliente queda creado en el sistema.
2. **Given** un cliente registrado, **When** un administrador o recepcionista
   actualiza su información, **Then** los cambios quedan guardados y son
   visibles en la consulta.
3. **Given** una sesión de administrador o recepcionista, **When** intenta
   guardar un cliente con datos obligatorios faltantes o con formato inválido,
   **Then** el sistema rechaza la operación e indica qué dato es incorrecto sin
   guardar el registro.
4. **Given** una sesión de un rol sin permiso de gestión de clientes (por
   ejemplo, entrenador o cliente), **When** intenta registrar o modificar un
   cliente, **Then** el sistema deniega la operación.
5. **Given** una sesión autorizada, **When** realiza una operación sobre
   clientes, **Then** el sistema muestra una confirmación o un error claro del
   resultado.
6. **Given** un cliente existente con nombre, teléfono y correo registrados,
   **When** se intenta guardar otro cliente con el mismo nombre y con el mismo
   teléfono o correo, **Then** el sistema muestra una advertencia de posible
   duplicado y solo guarda el registro si el usuario confirma; sin
   confirmación, no se guarda.

---

### User Story 4 - Consulta de clientes según el rol (Priority: P3)

Como administrador, recepcionista o entrenador, quiero consultar la
información básica de los clientes para realizar mis actividades.

**Why this priority**: La consulta es de uso frecuente, pero depende de que
existan clientes registrados por lo que se prueba después de la gestión.

**Independent Test**: Puede probarse de forma independiente iniciando sesión con
cada uno de los tres roles y verificando que la consulta muestre la información
que a cada rol le corresponde y nada más.

**Acceptance Scenarios**:

1. **Given** una sesión de administrador o recepcionista, **When** consulta los
   clientes, **Then** ve la información de los clientes registrados.
2. **Given** una sesión de entrenador, **When** consulta los clientes, **Then**
   ve únicamente el nombre completo y los datos de contacto (teléfono/correo)
   de cada cliente, sin otros datos que correspondan a otros roles.
3. **Given** una sesión de cliente, **When** intenta consultar la lista de
   clientes, **Then** el sistema deniega el acceso.
4. **Given** clientes registrados, **When** el usuario busca por nombre o dato
   de contacto, **Then** el sistema muestra los clientes coincidentes; si no hay
   coincidencias, lo indica de forma clara.

---

### User Story 5 - Consulta de la información propia (Priority: P3)

Como cliente, quiero consultar mi propia información para conocer los datos
registrados en el sistema.

**Why this priority**: Es un complemento de autoservicio; no bloquea las
operaciones del gimnasio y depende de que el cliente tenga su cuenta y sus
datos registrados.

**Independent Test**: Puede probarse de forma independiente iniciando sesión
como cliente y verificando que solo aparezca su propia información, nunca la de
otros clientes.

**Acceptance Scenarios**:

1. **Given** un cliente con cuenta activa, **When** inicia sesión, **Then** ve
   su propia información registrada.
2. **Given** un cliente autenticado, **When** intenta consultar la información
   de otro cliente, **Then** el sistema deniega el acceso y no muestra ningún
   dato ajeno.

---

### Edge Cases

- ¿Qué sucede cuando un usuario ingresa credenciales incorrectas varias veces?
  → El sistema responde siempre con el mismo mensaje de error, sin revelar si la
  cuenta existe; tras 5 intentos fallidos consecutivos con la misma cuenta, el
  acceso queda bloqueado durante 15 minutos y luego vuelve a permitirse.
- ¿Qué sucede cuando un usuario con la sesión expirada intenta guardar un
  cambio? → El sistema solicita volver a iniciar sesión y no aplica el cambio a
  medias.
- ¿Qué sucede cuando se intenta registrar un usuario con un correo ya
  utilizado? → El sistema rechaza la operación e indica que el correo ya existe.
- ¿Qué sucede cuando un usuario deshabilitado intenta iniciar sesión? → El
  sistema deniega el acceso con un mensaje claro.
- ¿Qué sucede cuando un rol intenta una operación fuera de sus permisos desde
  la interfaz? → El sistema la bloquea y no expone los datos, incluso si la
  opción no estaba oculta.
- ¿Qué sucede cuando faltan datos obligatorios o el formato es inválido? → El
  sistema impide el guardado y señala el dato incorrecto.
- ¿Qué sucede cuando la consulta de clientes no devuelve resultados? → El
  sistema lo indica de forma clara, sin mostrarse como un error técnico.
- ¿Qué sucede al registrar un cliente con el mismo nombre y el mismo teléfono
  o correo de un cliente ya existente? → El sistema muestra una advertencia de
  posible duplicado y solo guarda tras confirmación explícita.
- ¿Qué sucede cuando se crea o modifica un usuario con una contraseña que no
  cumple la política (menos de 8 caracteres, sin mayúscula o sin número)? → El
  sistema rechaza el guardado e indica el requisito incumplido.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow a registered user to authenticate with email
  and password.
- **FR-002**: System MUST reject invalid credentials with a clear user-facing
  message that does not reveal internal system details or whether the account
  exists. After 5 consecutive failed sign-in attempts with the same account,
  the system MUST block that account for 15 minutes, denying sign-in with a
  clear message during the block; a successful sign-in resets the counter.
- **FR-003**: System MUST restrict every user's actions according to their
  assigned role, enforcing the restriction in the system itself rather than
  only hiding options in the interface.
- **FR-004**: System MUST allow the administrator to register new users with an
  assigned role.
- **FR-005**: System MUST allow the administrator to modify existing users and
  change their assigned role.
- **FR-006**: User and role administration MUST be exclusive to the
  administrator role; any other role attempting it MUST be denied.
- **FR-007**: System MUST allow administrators and receptionists to create
  client records. When the new record's full name matches an existing client
  and its phone or email also matches, the system MUST show a possible-
  duplicate warning and save only after explicit confirmation; without
  confirmation the record MUST NOT be saved.
- **FR-008**: System MUST allow administrators and receptionists to update
  client records.
- **FR-009**: System MUST allow administrators, receptionists and trainers to
  consult client information according to each role's permissions, with
  trainers seeing only each client's full name and contact data (phone/email).
- **FR-010**: System MUST allow a client to view only their own information and
  MUST deny access to other clients' information.
- **FR-011**: System MUST validate user-entered data before storing it, keeping
  invalid or incomplete records out of storage and telling the user which data
  is wrong.
- **FR-012**: System MUST NOT store passwords in readable form, and MUST
  require passwords to have at least 8 characters including at least one
  uppercase letter and one number when a user is created or modified,
  rejecting non-compliant passwords with a clear message.
- **FR-013**: System MUST protect stored data against malicious input designed
  to alter or extract data improperly.
- **FR-014**: System MUST NOT physically delete user or client records within
  this scope; records are kept and may only be updated.
- **FR-015**: System MUST confirm the result of every operation with a clear
  success or error message.
- **FR-016**: System MUST end a session after 8 hours of inactivity or when
  the user signs out, requiring the user to authenticate again; unfinished
  operations MUST NOT be partially recorded.
- **FR-017**: System MUST establish the data structure required for
  memberships and payments without enabling any membership or payment
  functionality in this scope.
- **FR-018**: System MUST leave room to relate facial information to a client
  in the future without capturing, processing or validating any facial data in
  this scope.

### Key Entities

- **Usuario (User)**: a person with access to the system. Key attributes:
  full name, unique email used to sign in, protected password, active/disabled
  status, and an assigned role. Relationships: has one role; may represent the
  access account of a Cliente.
- **Rol (Role)**: the access level that defines which functions a user may
  perform: administrador, recepcionista, entrenador, cliente.
- **Cliente (Client)**: a person served by the gym. Key attributes:
  identifying data and contact information. Relationships: may be linked to a
  Usuario so the client can consult their own information; will later relate to
  memberships and facial information (out of scope here).
- **Tipo de membresía / Membresía / Pago**: structures prepared in this scope
  with no operational functionality; their behavior is deferred to a later
  scope.

### Scope Boundaries

- **In scope**: sign-in, user and role administration, client registration,
  update and consultation, own-information consultation, and the prepared data
  structure for future functionality.
- **Out of scope**: membership management and renewals, payment registration,
  outstanding-balance queries, facial recognition (capture, comparison or
  access validation), access records, dashboards, reports, functional audit
  log, password recovery by email, self-registration of users, mobile app,
  multiple branches, payroll, inventory, accounting, electronic invoicing and
  external payment processing.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At sprint close, 100% of the acceptance scenarios defined in this
  specification pass in the demonstration.
- **SC-002**: A registered user completes sign-in in under 10 seconds and sees
  only the functions of their role.
- **SC-003**: An administrator registers a new user in under 2 minutes, and an
  administrator or receptionist registers a new client in under 2 minutes.
- **SC-004**: In permission testing, 100% of attempts to perform actions outside
  the user's role are blocked, with 0 unauthorized accesses granted.
- **SC-005**: In a review of all stored user records, 0 passwords are found in
  readable form.
- **SC-006**: 100% of invalid-credential attempts receive a clear, user-friendly
  message that exposes no internal system details.
- **SC-007**: 90% of test users from the gym's staff complete a full client
  registration and consultation flow without assistance on their first attempt.
- **SC-008**: In security testing, 100% of sign-in attempts made during the
  15-minute block after 5 consecutive failures on the same account are rejected.

## Assumptions

- An initial administrator account exists (seeded), since user
  self-registration is out of scope.
- Email is the unique identifier for signing in; each user has one active role
  at a time.
- Password recovery by email is out of scope for this iteration.
- A session expires after 8 hours of inactivity or when the user signs out
  (confirmed clarification, 2026-10-08).
- Client records contain at minimum: full name, contact information and
  optional notes.
- Clients also have a user account with the "cliente" role so they can consult
  their own information.
- User and client records are never physically deleted in this scope; disabling
  or updating replaces deletion.
- Technical constraints (programming stack, folder structure, database engine
  and module conventions) are governed by the project constitution and the
  sprint documentation, and will be detailed during planning, not in this
  specification.
- Facial recognition, memberships and payments will be delivered in later
  scopes; this specification only requires that the structure be ready for
  them.
