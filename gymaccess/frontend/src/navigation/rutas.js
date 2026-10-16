// Registro central de navegación (refactor "Dark Fitness Luxury").
// Fuente de verdad de módulos, rutas y roles: el Navbar y App.jsx derivan
// de aquí. La autoridad real de autorización sigue siendo el servidor
// (FR-003); el cliente solo oculta lo que no corresponde al rol.

// Módulos del navbar flotante: pocos enlaces, sin saturación superior.
// `ruta` es la vista principal del módulo; las subvistas se navegan
// con la barra de secciones (BarraModulo).
export const MODULOS = [
  {
    clave: 'dashboard',
    etiqueta: 'Dashboard',
    ruta: '/dashboard',
    icono: 'resumen',
    roles: ['administrador', 'entrenador'],
  },
  {
    clave: 'clients',
    etiqueta: 'Clientes',
    ruta: '/clients',
    icono: 'clientes',
    roles: ['administrador', 'recepcionista', 'entrenador'],
  },
  {
    clave: 'memberships',
    etiqueta: 'Membresías',
    ruta: '/memberships',
    icono: 'membresias',
    roles: ['administrador', 'recepcionista'],
  },
  {
    clave: 'payments',
    etiqueta: 'Pagos',
    ruta: '/payments',
    icono: 'pagos',
    roles: ['administrador', 'recepcionista'],
  },
  {
    clave: 'access',
    etiqueta: 'Acceso',
    ruta: '/access',
    icono: 'acceso',
    roles: ['administrador', 'recepcionista', 'entrenador'],
  },
  {
    clave: 'training',
    etiqueta: 'Entrenamiento',
    ruta: '/training',
    icono: 'entrenamiento',
    roles: ['administrador', 'recepcionista', 'entrenador'],
  },
  {
    clave: 'users',
    etiqueta: 'Usuarios',
    ruta: '/users',
    icono: 'usuarios',
    roles: ['administrador'],
  },
  {
    clave: 'me-membership',
    etiqueta: 'Mi membresía',
    ruta: '/me/membership',
    icono: 'membresias',
    roles: ['cliente'],
  },
  {
    clave: 'me-routine',
    etiqueta: 'Mi rutina',
    ruta: '/me/routine',
    icono: 'entrenamiento',
    roles: ['cliente'],
  },
  {
    clave: 'me-info',
    etiqueta: 'Mi información',
    ruta: '/me/info',
    icono: 'clientes',
    roles: ['cliente'],
  },
];

// Subvistas por módulo (pestañas secundarias bajo el navbar).
// Los roles replican la matriz de VISTAS del App original.
export const SUBVISTAS = {
  '/clients': [
    { etiqueta: 'Consulta', ruta: '/clients', roles: ['administrador', 'recepcionista', 'entrenador'] },
    { etiqueta: 'Registro', ruta: '/clients/registro', roles: ['administrador', 'recepcionista'] },
  ],
  '/memberships': [
    { etiqueta: 'Membresías', ruta: '/memberships', roles: ['administrador', 'recepcionista'] },
    { etiqueta: 'Tipos', ruta: '/memberships/tipos', roles: ['administrador'] },
  ],
  '/access': [
    { etiqueta: 'Control de acceso', ruta: '/access', roles: ['administrador', 'recepcionista'] },
    { etiqueta: 'Registro de accesos', ruta: '/access/registro', roles: ['administrador', 'recepcionista', 'entrenador'] },
    { etiqueta: 'Registro de rostro', ruta: '/access/rostro', roles: ['administrador', 'recepcionista'] },
  ],
  '/training': [
    { etiqueta: 'Entrenadores', ruta: '/training', roles: ['administrador', 'recepcionista'] },
    { etiqueta: 'Mi carga', ruta: '/training/mi-carga', roles: ['entrenador'] },
    { etiqueta: 'Asignaciones', ruta: '/training/asignaciones', roles: ['administrador', 'recepcionista'] },
    { etiqueta: 'Rutinas', ruta: '/training/rutinas', roles: ['administrador', 'entrenador', 'recepcionista'] },
    { etiqueta: 'Seguimiento', ruta: '/training/seguimiento', roles: ['administrador', 'entrenador'] },
  ],
};

// Rutas base de cada vista (mapeo vista → URL) para redirecciones útiles.
export const RUTA_BASE = {
  dashboard: '/dashboard',
  'gestion-clientes': '/clients/registro',
  'consulta-clientes': '/clients',
  membresias: '/memberships',
  'tipos-membresia': '/memberships/tipos',
  pagos: '/payments',
  acceso: '/access',
  accesos: '/access/registro',
  'registrar-rostro': '/access/rostro',
  entrenadores: '/training',
  'mi-carga': '/training/mi-carga',
  asignaciones: '/training/asignaciones',
  rutinas: '/training/rutinas',
  seguimiento: '/training/seguimiento',
  usuarios: '/users',
  'mi-membresia': '/me/membership',
  'mi-rutina': '/me/routine',
  'mi-informacion': '/me/info',
};

// Ruta principal de cada rol al entrar al sistema (destino de "/").
export const RUTA_INICIAL = {
  administrador: '/dashboard',
  entrenador: '/dashboard',
  recepcionista: '/clients',
  cliente: '/me/membership',
};
