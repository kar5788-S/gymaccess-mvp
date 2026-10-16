# Pesos del modelo facial (Sprint 2)

Archivos servidos localmente por Vite desde `public/modelos/`, sin descargas
externas en tiempo de ejecución (research R-13).

**Origen**: `@vladmandic/face-api` v1.7.15 (`node_modules/@vladmandic/face-api/model/`),
licencia MIT. Para regenerar esta carpeta:

```bash
cd frontend
npm install
Copy-Item node_modules\@vladmandic\face-api\model\*.bin -Destination public\modelos\
Copy-Item node_modules\@vladmandic\face-api\model\*manifest.json -Destination public\modelos\
```

## Archivos usados por la aplicación

| Archivo | Modelo | Uso |
|---|---|---|
| `tiny_face_detector_model.*` | Tiny Face Detector | Detección de rostro en el punto de acceso (ligero y rápido) |
| `ssd_mobilenetv1_model.*` | SSD MobileNet V1 | Detección de mayor precisión (alternativa/respaldo) |
| `face_landmark_68_model.*` | Landmarks 68 puntos | Alineación del rostro |
| `face_landmark_68_tiny_model.*` | Landmarks 68 tiny | Alternativa ligera |
| `face_recognition_model.*` | Face Recognition | Descriptor de 128 dimensiones (único cálculo que interesa) |

Los modelos de edad, género y expresión **no** se incluyen: están fuera del
alcance (el reconocimiento facial solo identifica clientes registrados, FR-012,
constitución Principio VIII).

## Formato

Cada modelo se compone de un `*-weights_manifest.json` (pesos fraccionados) y su
`*.bin` asociado; ambos archivos deben mantenerse juntos y con el mismo nombre
base. El navegador los carga con `faceapi.nets.<modelo>.loadFromUri('/modelos')`.
