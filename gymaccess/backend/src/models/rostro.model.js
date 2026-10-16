// T048 [US5] Modelo de rostros: una fila por cliente (UNIQUE en
// `cliente_id`), `descriptor_facial VARBINARY(512)` (R-15).
// Única excepción a la prohibición de DELETE (FR-022 / R-27): la baja del
// cliente elimina esta fila; el descriptor JAMÁS se expone en respuestas.

import { consultar, ejecutar } from '../config/db.js';

const METADATOS = 'id, cliente_id, fecha_registro, estado';

// Registro o reemplazo en la misma fila (FR-011: re-registro = UPDATE).
export async function guardar({ cliente_id, descriptor_facial }) {
  const existente = await findByClienteId(cliente_id, true);
  if (existente) {
    await ejecutar(
      `UPDATE rostros
          SET descriptor_facial = ?, fecha_registro = CURRENT_TIMESTAMP, estado = 'activo'
        WHERE cliente_id = ?`,
      [descriptor_facial, cliente_id]
    );
    return { id: existente.id, reemplazado: true };
  }
  const resultado = await ejecutar(
    `INSERT INTO rostros (cliente_id, descriptor_facial) VALUES (?, ?)`,
    [cliente_id, descriptor_facial]
  );
  return { id: resultado.insertId, reemplazado: false };
}

// `conDescriptor` solo se usa en el servidor para cotejo (US6); las
// respuestas de la API jamás lo solicitan (FR-017).
export async function findByClienteId(clienteId, conDescriptor = false) {
  const columnas = conDescriptor ? `${METADATOS}, descriptor_facial` : METADATOS;
  const filas = await consultar(
    `SELECT ${columnas} FROM rostros WHERE cliente_id = ? LIMIT 1`,
    [clienteId]
  );
  return filas[0] ?? null;
}

// Descriptores activos para el cotejo en el servidor (US6, R-14).
export async function listarConDescriptor() {
  return consultar(
    `SELECT cliente_id, descriptor_facial
       FROM rostros
      WHERE estado = 'activo'`
  );
}

// Excepción FR-022: eliminación física al dar de baja al cliente.
export async function eliminarPorCliente(clienteId) {
  const resultado = await ejecutar('DELETE FROM rostros WHERE cliente_id = ?', [
    clienteId,
  ]);
  return resultado.affectedRows > 0;
}
