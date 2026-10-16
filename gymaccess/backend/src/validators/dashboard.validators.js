// T055 [US6] Validación del periodo del dashboard: solo `mes`, `30d` o
// `historico` (FR-017); el valor por defecto `mes` se aplica en el
// controlador cuando no se envía. Mensaje claro ante valor desconocido
// (FR-024).

import { query } from 'express-validator';

export const reglasFiltrarDashboard = [
  query('periodo')
    .optional()
    .isIn(['mes', '30d', 'historico'])
    .withMessage(
      'El periodo debe ser "mes", "30d" o "historico" (valor por defecto: mes).'
    ),
];
