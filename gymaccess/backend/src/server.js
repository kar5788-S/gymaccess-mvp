// Punto de entrada del backend (ES Modules, sin CommonJS).

import 'dotenv/config';
import app from './app.js';

const puerto = Number(process.env.PORT || 4000);

app.listen(puerto, () => {
  console.log(`API escuchando en http://localhost:${puerto}`);
});
