// T009 [Foundational] Descriptor facial: 128 `float32` little-endian en
// exactamente 512 bytes (R-15, data-model.md).
// La serialización es determinista: mismos 128 números ⇒ mismos 512 bytes.

export const DIMENSIONES_DESCRIPTOR = 128;
export const BYTES_DESCRIPTOR = DIMENSIONES_DESCRIPTOR * 4; // 512

// Valida que el descriptor sea un arreglo de exactamente 128 números finitos.
export function esDescriptorValido(descriptor) {
  return (
    Array.isArray(descriptor) &&
    descriptor.length === DIMENSIONES_DESCRIPTOR &&
    descriptor.every((v) => typeof v === 'number' && Number.isFinite(v))
  );
}

// number[128] → Buffer de 512 bytes (little-endian), listo para VARBINARY(512).
export function serializarDescriptor(descriptor) {
  if (!esDescriptorValido(descriptor)) {
    throw new Error(
      `El descriptor debe tener exactamente ${DIMENSIONES_DESCRIPTOR} valores numéricos.`
    );
  }
  const vista = new Float32Array(DIMENSIONES_DESCRIPTOR);
  for (let i = 0; i < DIMENSIONES_DESCRIPTOR; i += 1) {
    vista[i] = descriptor[i];
  }
  // Buffer.from(ArrayBuffer) copia los 512 bytes en orden little-endian nativo.
  return Buffer.from(vista.buffer);
}

// Buffer/BufferLike de 512 bytes → number[128].
export function deserializarDescriptor(datos) {
  const buffer = Buffer.isBuffer(datos) ? datos : Buffer.from(datos);
  if (buffer.length !== BYTES_DESCRIPTOR) {
    throw new Error(
      `El descriptor almacenado debe pesar exactamente ${BYTES_DESCRIPTOR} bytes.`
    );
  }
  const vista = new Float32Array(DIMENSIONES_DESCRIPTOR);
  buffer.copy(Buffer.from(vista.buffer)); // copia respetando el alineamiento
  return Array.from(vista);
}
