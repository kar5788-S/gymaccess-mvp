// T008 [Foundational] Servicio de auditoría (R-22, FR-020).
// Registra las acciones críticas SIN datos biométricos ni sensibles:
// nunca se guardan descriptores faciales, contraseñas ni tokens.
// Los fallos al auditar no rompen la operación principal (best-effort),
// pero quedan visibles en la consola del servidor para diagnóstico.

import * as auditoriaModelo from '../models/auditoria.model.js';

const LONGITUD_MAXIMA_DESCRIPCION = 1000;
const CLAVES_PROHIBIDAS = ['descriptor', 'descriptor_facial', 'contrasena', 'token'];

// Elimina cualquier valor que parezca dato biométrico o sensible y trunca.
function sanitizarDescripcion(descripcion) {
  if (descripcion === null || descripcion === undefined) return null;
  let texto = String(descripcion);

  for (const clave of CLAVES_PROHIBIDAS) {
    const patron = new RegExp(`"${clave}"\\s*:\\s*\\[[^\\]]*\\]`, 'gi');
    texto = texto.replace(patron, `"${clave}": [oculto]`);
  }

  if (texto.length > LONGITUD_MAXIMA_DESCRIPCION) {
    texto = `${texto.slice(0, LONGITUD_MAXIMA_DESCRIPCION)}…`;
  }
  return texto;
}

// Ejecuta el registro de auditoría. Devuelve el id o null si no se pudo.
export async function registrar({
  usuarioId = null,
  accion,
  modulo,
  resultado = 'exitoso',
  descripcion = null,
}) {
  if (!accion || !modulo) return null; // registro incompleto: no auditar

  try {
    return await auditoriaModelo.crear({
      usuario_id: usuarioId,
      accion,
      modulo,
      resultado,
      descripcion: sanitizarDescripcion(descripcion),
    });
  } catch (error) {
    console.error('[auditoria] No se pudo registrar la auditoría:', error.message);
    return null;
  }
}

// Consulta para GET /api/auditoria (solo administrador).
export async function listarAuditoria({ fecha, modulo, limite } = {}) {
  return auditoriaModelo.listar({ fecha, modulo, limite });
}
