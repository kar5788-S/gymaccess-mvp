// T060 [US6] Configuración facial del servidor (R-16).
// `FACIAL_UMBRAL_COINCIDENCIA` se lee de las variables de entorno con
// valor por defecto 0.6 (umbral de referencia face-api). No es secreto:
// se documenta en `.env.example`.

export const UMBRAL_DEFECTO = 0.6;

export function obtenerUmbral() {
  const valor = Number(process.env.FACIAL_UMBRAL_COINCIDENCIA);
  return Number.isFinite(valor) && valor > 0 ? valor : UMBRAL_DEFECTO;
}
