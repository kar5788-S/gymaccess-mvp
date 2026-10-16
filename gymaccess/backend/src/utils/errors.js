// Errores de aplicación con código, mensaje para el usuario y código HTTP.
// Los mensajes NUNCA deben contener información interna del sistema (FR-002).

export const codigosError = {
  NO_AUTENTICADO: 'NO_AUTENTICADO',
  SIN_PERMISO: 'SIN_PERMISO',
  CREDENCIALES_INVALIDAS: 'CREDENCIALES_INVALIDAS',
  CUENTA_BLOQUEADA: 'CUENTA_BLOQUEADA',
  CUENTA_DESHABILITADA: 'CUENTA_DESHABILITADA',
  VALIDACION: 'VALIDACION',
  DUPLICADO: 'DUPLICADO',
  POSIBLE_DUPLICADO: 'POSIBLE_DUPLICADO',
  NO_ENCONTRADO: 'NO_ENCONTRADO',
  ERROR_INTERNO: 'ERROR_INTERNO',
  // Sprint 2 (contracts/api.md — códigos nuevos)
  MEMBRESIA_ACTIVA_EXISTENTE: 'MEMBRESIA_ACTIVA_EXISTENTE',
  ADEUDO_PENDIENTE: 'ADEUDO_PENDIENTE',
  ESTADO_NO_PERMITE: 'ESTADO_NO_PERMITE',
  CLIENTE_NO_ACTIVO: 'CLIENTE_NO_ACTIVO',
  MEMBRESIA_REQUERIDA: 'MEMBRESIA_REQUERIDA',
  DESCRIPTOR_INVALIDO: 'DESCRIPTOR_INVALIDO',
  ROSTRO_NO_ENCONTRADO: 'ROSTRO_NO_ENCONTRADO',
  // Sprint 3 (contracts/api.md — códigos nuevos)
  ENTRENADOR_NO_VALIDO: 'ENTRENADOR_NO_VALIDO',
  USUARIO_YA_ENTRENADOR: 'USUARIO_YA_ENTRENADOR',
  CLIENTE_SIN_ENTRENADOR: 'CLIENTE_SIN_ENTRENADOR',
  FUERA_DE_CARGA: 'FUERA_DE_CARGA',
};

export class AppError extends Error {
  constructor(codigo, mensaje, status = 500, detalles) {
    super(mensaje);
    this.name = 'AppError';
    this.codigo = codigo;
    this.mensaje = mensaje;
    this.status = status;
    this.detalles = detalles;
  }
}
