<!--

Reporte de Impacto de la Sincronización

- Cambio de versión: 1.0.0 (contenido base en docs/reglas.md; el archivo
  .specify/memory/constitution.md era un scaffold sin rellenar) → 1.1.0
- Tipo de bump: MINOR — adopción formal del contenido de docs/reglas.md como
  constitución del proyecto, con guía de gobernanza materialmente expandida
  (procedimiento de enmienda explícito y registro de fechas de gobernanza).

- Principios modificados:
  - Scaffold sin rellenar (5 slots PRINCIPLE_1..PRINCIPLE_5 con ejemplos) →
    11 principios numerados I–XI tomados de docs/reglas.md.
  - Títulos de la fuente conservados sin cambios:
    I. Alcance, MVP y Fuente de Verdad (NO NEGOCIABLE)
    II. Arquitectura con Responsabilidades Separadas (NO NEGOCIABLE)
    III. Stack Tecnológico y Base de Datos
    IV. Base de Datos y Persistencia (NO NEGOCIABLE)
    V. Seguridad y Protección de Información (NO NEGOCIABLE)
    VI. Roles y Permisos
    VII. Integridad de las Reglas de Negocio (NO NEGOCIABLE)
    VIII. Reconocimiento Facial y Control de Acceso
    IX. API y Manejo de Errores
    X. Pruebas
    XI. UX/UI Profesional y Sencilla

- Secciones añadidas:
  - "Tecnologías y Dependencias" (rellena SECTION_2_NAME).
  - "Flujo de Desarrollo" (rellena SECTION_3_NAME).
  - "Decisiones Pendientes" (sección adicional proveniente de docs/reglas.md).

- Secciones eliminadas:
  - Comentarios de ejemplo y slots de placeholder del scaffold
    ([PROJECT_NAME], [PRINCIPLE_N_NAME], [PRINCIPLE_N_DESCRIPTION],
    [SECTION_2_NAME], [SECTION_3_NAME], [GOVERNANCE_RULES],
    [CONSTITUTION_VERSION], [RATIFICATION_DATE], [LAST_AMENDED_DATE]).

- Otros cambios:
  - Línea de metadatos con versión, fecha de ratificación y fecha de
    última enmienda (2026-10-07).
  - Gobernanza: se agrega procedimiento de enmienda explícito y se separa
    la política de versiones y la revisión de cumplimiento.

- Pendientes (deferred TODOs):
  - TODO(RATIFICATION_DATE): la fecha de ratificación es desconocida;
    docs/reglas.md indica "Ratificación: pendiente del equipo". Requiere
    aprobación manual del equipo antes de eliminar este TODO.

Este reporte es material temporal de revisión, no contenido de gobernanza,
y DEBE eliminarse antes de commitear la constitución enmendada.

-->

# Sistema de Gestión para Gimnasio — Constitución

El Sistema de Gestión para Gimnasio es un proyecto académico cuyo objetivo es
desarrollar una plataforma web para administrar clientes, membresías, pagos y
accesos mediante reconocimiento facial.

El sistema permitirá centralizar la información del gimnasio, controlar el
estado de las membresías, registrar pagos y validar el acceso de los clientes.
También contará con diferentes roles para limitar el acceso a las funciones
según las responsabilidades de cada usuario.

El detalle de los requisitos, módulos, entidades, reglas de negocio y sprints
se encuentra en la documentación del proyecto y constituye la fuente de verdad
para el desarrollo.

## Principios Fundamentales

### I. Alcance, MVP y Fuente de Verdad (NO NEGOCIABLE)

* El desarrollo DEBE respetar el alcance definido para el proyecto.

* NO se deben agregar funcionalidades que no formen parte del alcance sin
  autorización previa del equipo.

* El sistema DEBE desarrollarse por etapas y respetar el orden establecido
  para los sprints.

* El MVP DEBE concentrarse en las funciones principales del gimnasio:
  clientes, membresías, pagos, reconocimiento facial, control de acceso,
  usuarios, roles y reportes.

* Las funciones que no formen parte del alcance actual podrán considerarse
  como mejoras futuras, pero NO deberá implementarse dentro del MVP.

* DEBE mantenerse la relación entre requisito, historia de usuario, sprint
  e implementación.

* Si cambia una regla de negocio, rol, entidad, requisito o sprint, la
  documentación del proyecto DEBE actualizarse.

* Justificación: mantener un alcance definido permite desarrollar un sistema
  funcional y evitar que el proyecto crezca de manera innecesaria.

### II. Arquitectura con Responsabilidades Separadas (NO NEGOCIABLE)

* El proyecto DEBE separar el frontend, backend y base de datos.

* El frontend DEBE encargarse de la interfaz y de la interacción con el usuario.

* El backend DEBE encargarse de la lógica de negocio, autenticación,
  autorización y comunicación con la base de datos.

* La base de datos DEBE almacenar la información necesaria para el funcionamiento
  del sistema.

* La lógica de negocio NO DEBE concentrarse directamente en los componentes
  de la interfaz.

* El backend DEBE organizarse de manera modular, separando rutas,
  controladores, modelos, servicios, middlewares y utilidades.

* El reconocimiento facial y el control de acceso DEBEN mantenerse como
  módulos independientes, aunque puedan comunicarse entre ellos.

* Justificación: separar las responsabilidades facilita el mantenimiento,
  las pruebas y futuras modificaciones del sistema.

### III. Stack Tecnológico y Base de Datos

* Frontend: React con JavaScript.

* Backend: Node.js con Express y JavaScript.

* Base de datos: MySQL.

* El backend DEBE utilizar una tecnología compatible con MySQL para realizar
  las operaciones de persistencia.

* La comunicación entre frontend y backend DEBE realizarse mediante una API REST.

* La autenticación DEBE utilizar JWT.

* Las contraseñas DEBEN almacenarse utilizando un algoritmo de cifrado/hash
  seguro como bcrypt.

* El reconocimiento facial DEBE utilizar una tecnología compatible con
  aplicaciones web y JavaScript.

* El sistema DEBE utilizar variables de entorno para configurar las conexiones
  y credenciales.

* NO se deben agregar tecnologías o dependencias innecesarias.

* Toda dependencia nueva DEBE justificarse antes de ser incorporada al proyecto.

* Justificación: utilizar un conjunto de tecnologías conocido y relacionado
  con JavaScript facilita el desarrollo y mantenimiento del sistema.

### IV. Base de Datos y Persistencia (NO NEGOCIABLE)

La base de datos DEBE desarrollarse en dos sprints.

#### Sprint 1 — Información principal y financiera

La primera etapa DEBE incluir las siguientes tablas:

* `usuarios`
* `clientes`
* `tipos_membresia`
* `membresias`
* `pagos`

Estas tablas permitirán administrar los usuarios del sistema, registrar
clientes, definir los tipos de membresía, controlar la vigencia de las
membresías y registrar los pagos realizados.

#### Sprint 2 — Reconocimiento, acceso y auditoría

La segunda etapa DEBE incluir:

* `rostros`
* `accesos`
* `auditoria`

Estas tablas permitirán almacenar la información necesaria para el
reconocimiento facial, registrar los accesos realizados y mantener un historial
de las acciones importantes realizadas dentro del sistema.

* Los datos DEBEN mantener relaciones lógicas mediante identificadores.

* El frontend NUNCA debe conectarse directamente a MySQL.

* Únicamente el backend DEBE tener acceso a la base de datos.

* Los cambios realizados en la estructura de la base de datos DEBEN quedar
  documentados.

* La información facial DEBE tratarse como información sensible y almacenarse
  con las medidas de seguridad correspondientes.

* Justificación: separar la base de datos en dos etapas permite construir
  primero la estructura principal y posteriormente integrar el reconocimiento
  facial, control de acceso y auditoría.

### V. Seguridad y Protección de Información (NO NEGOCIABLE)

* Las contraseñas NUNCA deben almacenarse en texto plano.

* Los secretos, contraseñas y credenciales DEBEN manejarse mediante variables
  de entorno.

* El archivo `.env` NO debe subirse al repositorio.

* DEBE existir un archivo `.env.example` sin información sensible.

* Los permisos de cada rol DEBEN validarse desde el backend.

* Ocultar una opción en la interfaz NO debe considerarse una medida suficiente
  de seguridad.

* Las entradas proporcionadas por los usuarios DEBEN validarse en el backend.

* El sistema NO debe mostrar información técnica interna ni errores que puedan
  comprometer la seguridad.

* La información relacionada con reconocimiento facial DEBE protegerse y solo
  podrá ser utilizada para las funciones establecidas dentro del sistema.

* Justificación: el sistema maneja información personal, financiera y
  biométrica de los clientes.

### VI. Roles y Permisos

El sistema DEBE manejar diferentes niveles de acceso.

#### Administrador

DEBE tener acceso a:

* Clientes.
* Membresías.
* Pagos.
* Control financiero.
* Reconocimiento facial.
* Control de acceso.
* Usuarios y roles.
* Reportes.
* Auditoría.

#### Recepcionista

DEBE poder:

* Registrar clientes.
* Modificar información de clientes.
* Registrar pagos.
* Renovar membresías.
* Consultar membresías.
* Registrar información facial.
* Consultar accesos.

NO debe modificar configuraciones administrativas que correspondan al
administrador.

#### Entrenador

DEBE poder:

* Consultar clientes.
* Consultar información básica.
* Consultar estado de membresías.
* Consultar asistencia o accesos.

NO debe tener acceso a información financiera administrativa.

#### Cliente

DEBE poder:

* Consultar su información personal.
* Consultar su membresía.
* Consultar sus pagos.
* Consultar adeudos.
* Consultar su historial de accesos.

El cliente NO debe poder consultar información de otros clientes.

* Justificación: la separación de roles evita accesos innecesarios y protege
  la información de los usuarios.

### VII. Integridad de las Reglas de Negocio (NO NEGOCIABLE)

* Un cliente DEBE estar registrado antes de poder asignarle una membresía.

* Una membresía DEBE estar relacionada con un cliente y con un tipo de
  membresía válido.

* Una membresía DEBE tener una fecha de inicio y una fecha de vencimiento.

* El sistema DEBE identificar si una membresía está activa, vencida,
  suspendida o cancelada.

* Un pago DEBE estar relacionado con un cliente y, cuando corresponda, con
  una membresía.

* El sistema DEBE conservar el historial de pagos.

* Un cliente con membresía vencida NO debe recibir acceso como cliente activo.

* El reconocimiento facial DEBE identificar al cliente antes de validar su
  acceso.

* El acceso DEBE registrarse independientemente de si fue autorizado o
  rechazado.

* Cuando un acceso sea rechazado, DEBE registrarse el motivo correspondiente.

* Un registro de acceso NO debe eliminarse de manera ordinaria.

* La información financiera NO debe eliminarse sin autorización.

* Justificación: estas reglas mantienen la consistencia de la información y
  permiten conocer el historial real de clientes, pagos y accesos.

### VIII. Reconocimiento Facial y Control de Acceso

* El reconocimiento facial DEBE utilizarse únicamente para identificar y
  validar el acceso de clientes registrados.

* Un cliente DEBE tener previamente registrada su información facial para
  utilizar esta función.

* El sistema DEBE comprobar que el cliente identificado tenga una membresía
  válida antes de autorizar su entrada.

* Si la membresía está vencida, suspendida o no existe, el acceso DEBE ser
  rechazado.

* Todo intento de acceso DEBE generar un registro.

* El sistema DEBE indicar si el acceso fue autorizado o rechazado.

* El reconocimiento facial NO debe utilizarse para realizar vigilancia,
  seguimiento o funciones diferentes a las definidas en el proyecto.

* El funcionamiento del reconocimiento facial dependerá de factores como
  cámara, iluminación y condiciones del entorno.

* Justificación: el reconocimiento facial es una de las funciones principales
  del sistema y debe utilizarse únicamente para el propósito establecido.

### IX. API y Manejo de Errores

* Las rutas de la API DEBEN mantener una estructura consistente.

* Las respuestas DEBEN utilizar formato JSON.

* DEBEN utilizarse códigos HTTP apropiados.

* DEBE existir middleware de autenticación.

* DEBE existir middleware de autorización para validar los roles.

* Los datos recibidos por la API DEBEN validarse antes de procesarse.

* El manejo de errores DEBE estar centralizado.

* Los mensajes de error DEBEN ser claros para el usuario sin revelar
  información interna del sistema.

* Justificación: una API organizada facilita la comunicación entre React y
  Node.js y permite mantener el sistema de manera ordenada.

### X. Pruebas

* Las funciones principales DEBEN probarse antes de considerarse terminadas.

* Las pruebas DEBEN incluir como mínimo:

  * Registro y modificación de clientes.
  * Registro y renovación de membresías.
  * Registro de pagos.
  * Consulta de adeudos.
  * Autenticación.
  * Validación de roles.
  * Reconocimiento facial.
  * Autorización y rechazo de accesos.
  * Registro de accesos.
  * Generación de reportes.

* Una funcionalidad NO debe considerarse terminada únicamente porque la
  interfaz visual exista.

* Cuando una funcionalidad dependa del backend y la base de datos, DEBE
  comprobarse su funcionamiento de extremo a extremo.

* Justificación: las pruebas permiten detectar errores antes de la presentación
  final del sistema.

### XI. UX/UI Profesional y Sencilla

* La interfaz DEBE ser clara, sencilla y fácil de utilizar.

* El diseño DEBE mantener una apariencia consistente en todos los módulos.

* Las acciones principales DEBEN ser fáciles de identificar.

* Las operaciones de eliminación DEBEN solicitar confirmación.

* El sistema DEBE mostrar mensajes de éxito o error después de las operaciones.

* Los estados de las membresías y accesos DEBEN mostrarse de forma clara.

* Los elementos visuales DEBEN utilizarse para facilitar la interpretación
  de la información y NO únicamente como decoración.

* Justificación: el sistema será utilizado por personal del gimnasio que
  necesita consultar y registrar información rápidamente.

## Tecnologías y Dependencias

* Frontend: React.
* Lenguaje principal: JavaScript.
* Backend: Node.js.
* Framework backend: Express.js.
* Base de datos: MySQL.
* Autenticación: JWT.
* Hash de contraseñas: bcrypt.
* Reconocimiento facial: librería o tecnología compatible con JavaScript.
* Control de versiones: Git y GitHub.
* API: REST.

Se deberán priorizar herramientas gratuitas o de bajo costo.

NO se deberán agregar librerías o tecnologías que no sean necesarias para el
funcionamiento del sistema.

Toda dependencia nueva DEBE justificarse antes de incorporarse al proyecto.

## Flujo de Desarrollo

Para implementar cada sprint, el equipo DEBE:

1. Revisar los requisitos y el alcance del proyecto.
2. Revisar las historias de usuario correspondientes.
3. Identificar las funcionalidades pendientes.
4. Definir las tareas del sprint.
5. Implementar únicamente el alcance acordado.
6. Realizar pruebas de las funcionalidades.
7. Corregir errores encontrados.
8. Integrar los cambios al proyecto.
9. Actualizar la documentación cuando sea necesario.

Una funcionalidad se considera terminada cuando:

* Está implementada.
* Se encuentra integrada con el backend cuando corresponde.
* Los datos se almacenan y consultan correctamente.
* Se validan los permisos.
* Se validan los datos de entrada.
* Se manejan errores previsibles.
* Se realizó una prueba funcional.
* No contiene información sensible o contraseñas.
* No afecta funcionalidades existentes.

Las ramas del proyecto DEBEN utilizar nombres relacionados con la funcionalidad,
por ejemplo:

`feature/clientes`

`feature/membresias`

`feature/pagos`

`feature/reconocimiento-facial`

`fix/error-acceso`

Los commits DEBEN ser pequeños y describir claramente el cambio realizado.

## Decisiones Pendientes

Estas decisiones podrán definirse durante el desarrollo, pero DEBEN ser
aprobadas por el equipo antes de considerarse definitivas:

* Librería específica para reconocimiento facial.
* Diseño final de la interfaz.
* Librería de componentes para React.
* Estrategia de manejo de estado en React.
* Estructura definitiva de la API REST.
* Herramienta o estrategia para realizar pruebas.
* Forma de almacenar las plantillas o características faciales.
* Estrategia para registrar fotografías o datos faciales.
* Forma de generar reportes.
* Implementación de gráficas para el módulo financiero.
* Método de despliegue del sistema.
* Servicio de hosting, en caso de realizar una demostración en línea.

## Gobernanza

* Esta constitución tiene prioridad sobre las decisiones de desarrollo que
  contradigan los principios establecidos.

* Procedimiento de enmienda: toda modificación a esta constitución DEBE
  proponerse al equipo con su justificación, recibir la aprobación del equipo,
  quedar documentada en este archivo y actualizar la versión y las fechas de
  gobernanza antes de considerarse vigente.

* Cualquier modificación importante al alcance, arquitectura, tecnologías,
  roles o reglas de negocio DEBE ser aprobada por el equipo.

* Las modificaciones relevantes DEBEN quedar documentadas.

* Política de versiones: la constitución DEBE mantener un control de versiones
  y los cambios DEBEN seguir el siguiente criterio:

  * **MAJOR:** cambio o eliminación de un principio importante.
  * **MINOR:** incorporación de nuevos principios o secciones.
  * **PATCH:** correcciones, aclaraciones o cambios menores de redacción.

* Revisión de cumplimiento: el cumplimiento de estas reglas DEBE revisarse
  durante el desarrollo de cada sprint, y las revisiones de código DEBEN
  verificar el cumplimiento de la constitución.

* Cualquier desviación DEBE justificarse, ser conocida por el equipo y quedar
  registrada en la documentación del proyecto.

## Nota de ratificación pendiente — Alcance del Sprint 3 (2026-10-15)

Documento preparado para su aprobación; **no modifica ningún principio** ni
altera la versión vigente. Registra los alcances autorizados por la
especificación del Sprint 3 (`specs/003-entrenadores-rutinas-dashboard`) que
requieren la ratificación del equipo:

1. **Tercera etapa de la base de datos** — el principio IV enuncia que la base
   de datos se desarrolla "en dos sprints"; el Sprint 3 añadió la migración
   `003_sprint3.sql` con las tablas `entrenadores`,
   `asignaciones_entrenador`, `rutinas`, `ejercicios_rutina`,
   `objetivos_entrenamiento` y `progresos_clientes`, más la vista
   `estadisticas_dashboard` (sin `ALTER` sobre tablas existentes y sin seeds
   nuevos).
2. **Permisos de escritura del entrenador** — el principio VI mantiene al
   entrenador en modo consulta; el Sprint 3 le autoriza crear y editar rutinas,
   objetivos y progresos de los clientes de su carga, y consultar su carga y su
   panel de indicadores, siempre validado en el servidor y sin acceso a
   información financiera.

Si el equipo **aprueba** estos alcances, deberá enmendarse la constitución
según el procedimiento de gobernanza: actualizar los principios IV y VI,
subir la versión en MINOR y registrar la fecha de enmienda. Si el equipo **no
los aprueba**, deberá definirse un plan de reversión para retirar la tercera
etapa de la base de datos y los permisos de escritura del entrenador.

Detalle del cambio documentado en: `docs/reglas.md` (secciones IV y VI),
`docs/project-context.md` (secciones 4, 6.3, 14.1, 16 y 17) y
`gymaccess/README.md`.

**Versión**: 1.1.0 | **Ratificada**: TODO(RATIFICATION_DATE) — pendiente de aprobación por el equipo | **Última enmienda**: 2026-10-07
