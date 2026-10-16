# Sprint 3 - Plan de tareas

## Objetivo general

Desarrollar el alcance definido en `docs/sprint-3.md` para entrenadores, rutinas de entrenamiento y dashboard administrativo, priorizando primero la base de datos y la capa backend, luego la capa frontend y finalmente la validación funcional.

## Orden de prioridad

### Prioridad 1 - Investigación y modelo de datos

#### T-01. Definir el modelo de datos del sprint
- Revisar las tablas existentes de `usuarios`, `clientes`, `membresias` y `accesos` para reutilizar las relaciones ya creadas.
- Definir la estructura de `entrenadores`, `asignaciones_entrenador`, `rutinas`, `ejercicios_rutina`, `objetivos_entrenamiento` y `progresos_clientes`.
- Establecer claves primarias, foráneas, fechas de creación/actualización y estados relevantes.
- Definir si el historial de progreso y metas se conservará con registros históricos en lugar de sobrescribir información.

#### T-02. Definir permisos y reglas de negocio
- Registrar los permisos de administrador, recepcionista, entrenador y cliente para este sprint.
- Aplicar reglas de negocio: un cliente tiene un entrenador principal, un entrenador solo gestiona clientes asignados, el cliente solo consulta su propia información.
- Definir qué operaciones puede ejecutar cada rol sobre rutinas, objetivos, progreso, asignaciones y dashboard.

#### T-03. Definir contratos de API
- Diseñar endpoints para trenadores, asignaciones, rutinas y progreso.
- Definir payloads de entrada/salida, validaciones y mensajes de error.
- Documentar los escenarios de negocio para creación, consulta, modificación y eliminación lógica si aplica.

#### T-04. Definir estructura del dashboard administrativo
- Identificar métricas clave: clientes activos, entrenadores activos, clientes por entrenador, progreso general, metas cumplidas y estado de rutinas.
- Definir qué datos se muestran para cada rol.
- Establecer qué agregados se calculan en base de datos y cuáles se calculan en el backend en tiempo real.

#### T-05. Preparar la base de datos y migraciones
- Crear scripts SQL para las nuevas tablas y relaciones del sprint.
- Incluir índices para búsquedas por cliente, entrenador y fechas.
- Incorporar auditoría para cambios clave en asignaciones, rutinas y progreso.

### Prioridad 2 - Backend

#### T-06. Implementar modelo y repositorios de entrenadores
- Crear la lógica para registrar y consultar entrenadores.
- Validar que el entrenador esté asociado a un usuario válido del sistema.
- Implementar búsqueda por nombre, estado o cliente asignado.

#### T-07. Implementar asignación de entrenador a cliente
- Crear endpoints para asignar, reasignar y consultar clientes por entrenador.
- Validar que el cliente exista y que el entrenador esté activo.
- Registrar eventos relevantes en auditoría.

#### T-08. Implementar gestión de rutinas
- Crear endpoints para crear, modificar y consultar rutinas.
- Validar que la rutina pertenezca a un cliente y entrenador válidos.
- Incluir ejercicios, series, repeticiones, duración o instrucciones del entrenamiento.

#### T-09. Implementar objetivos y seguimiento del progreso
- Crear endpoints para definir objetivos de entrenamiento.
- Registrar cambios de progreso por cliente y por fecha.
- Mantener historial para comparación temporal.
- Validar que el registro sea realizado por el entrenador asignado o un usuario autorizado.

#### T-10. Implementar consultas del cliente sobre su propia información
- Permitir que el cliente consulte su rutina asignada y su historial de progreso.
- Restringir la respuesta a los datos del cliente autenticado.
- Evitar fugas de información hacia otros clientes o personal no autorizado.

#### T-11. Implementar dashboard administrativo
- Crear endpoints para obtener indicadores globales del gimnasio.
- Agregar métricas por entrenador, por cliente y por rango de fechas.
- Validar permisos para que solo el administrador (y según el caso recepcionista) pueda consultar la información consolidada.

#### T-12. Implementar auditoría y logging
- Registrar creación y modificación de entrenadores, asignaciones, rutinas y avances.
- Guardar usuario responsable, operación realizada y fecha.
- asegurar trazabilidad para auditoría y soporte operativo.

#### T-13. Validar integridad y seguridad del backend
- Revisar validaciones de entrada, manejo de errores y respuestas HTTP.
- Confirmar uso de consultas parametrizadas para evitar inyección SQL.
- Confirmar que los permisos se validan en cada endpoint relevante.

### Prioridad 3 - Frontend

#### T-14. Diseñar la estructura de navegación y roles
- Crear rutas para administración, entrenador y cliente.
- Definir accesos por rol para secciones de entrenadores, rutinas, progreso y dashboard.
- Implementar guardas de acceso para evitar vistas no autorizadas.

#### T-15. Construir módulo de gestión de entrenadores
- Pantalla para registrar y listar entrenadores.
- Formulario de edición y activación/inactivación.
- Validación de campos obligatorios e identificación del usuario asociado.

#### T-16. Construir módulo de asignación de entrenador a cliente
- Pantalla para asignar entrenador a un cliente.
- Filtro por cliente o por entrenador para consultar asignaciones actuales.
- Mostrar estado de la asignación y mensajes de validación.

#### T-17. Construir módulo de rutinas
- Pantalla para crear y editar rutinas.
- Formulario para incluir ejercicio, series, repeticiones, peso, duración o instrucciones.
- Vista de rutina por cliente y por entrenador.

#### T-18. Construir módulo de objetivos y progreso
- Pantalla para registrar objetivos del cliente.
- Formulario para registrar avances, métricas o comentario del entrenador.
- Visualización del historial de progreso por cliente.

#### T-19. Construir vista del cliente sobre su rutina y evolución
- Pantalla para que el cliente consulte su rutina asignada.
- Mostrar objetivos, avances y evolución a lo largo del tiempo.
- Mantener una experiencia clara y legible para usuarios no técnicos.

#### T-20. Construir dashboard administrativo
- Pantalla con KPIs clave: clientes activos, entrenadores activos, clientes por entrenador, progreso general.
- Mostrar resúmenes y listas relevantes para la toma de decisiones.
- Ajustar visualización según permisos del usuario autenticado.

#### T-21. Integrar frontend con API REST
- Conectar formularios y pantallas con los endpoints del backend.
- Manejar estados de carga, errores y mensajes de éxito.
- Alinear respuestas del backend con los componentes del frontend.

### Prioridad 4 - Pruebas de aceptación

#### T-22. Definir la matriz de pruebas del sprint
- Casos de éxito para administrador, recepcionista, entrenador y cliente.
- Casos de error por permisos, datos inválidos y clientes inexistentes.
- Casos de auditoría y validación del dashboard.

#### T-23. Ejecutar pruebas unitarias del backend
- Validar creación de entrenadores.
- Validar asignación de clientes a entrenadores.
- Validar creación de rutinas y objetivos.
- Validar cálculo de métricas del dashboard.

#### T-24. Ejecutar pruebas de integración API
- Probar endpoints con autenticación real.
- Validar respuestas según rol y permisos.
- Validar integridad referencial con clientes, usuarios y entrenadores.

#### T-25. Ejecutar pruebas de frontend
- Validar acceso a rutas protegidas según rol.
- Validar formularios de entrenador, asignación y rutina.
- Validar vistas del cliente y del dashboard administrativo.

#### T-26. Ejecutar pruebas de aceptación del usuario
- Administrador registra entrenadores y los asigna a clientes.
- Entrenador crea una rutina y registra progreso.
- Cliente visualiza su rutina y su evolución.
- Administrador revisa dashboard con indicadores clave.

#### T-27. Corregir defectos y cerrar entregables
- Ajustar fallas de negocio detectadas durante pruebas.
- Corregir inconsistencia de permisos o datos.
- Revalidar que los entregables cumplen los criterios de aceptación del sprint.

## Entregables esperados por prioridad

- Prioridad 1: modelo de datos, permisos, contratos de API y estructura del dashboard.
- Prioridad 2: backend funcional con entrenadores, asignaciones, rutinas, progreso y dashboard.
- Prioridad 3: frontend con módulos de entrenador, rutina, progreso y dashboard.
- Prioridad 4: validación funcional por pruebas de aceptación y correcciones finales.

## Criterio de cierre

El sprint se considera listo cuando:

1. Los entrenadores pueden registrarse y gestionarse correctamente.
2. Los clientes quedan asignados a un entrenador válido.
3. Los entrenadores pueden crear rutinas y registrar progreso y objetivos.
4. El cliente puede consultar su propia información de entrenamiento.
5. El administrador puede consultar un dashboard útil y seguro del gimnasio.
6. El backend y frontend cumplen los permisos y requisitos de auditoría.
7. Las pruebas de aceptación y pruebas de integración pasan sin errores críticos.
