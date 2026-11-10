# Directorio de participantes · Educación Inicial La Paz

Webapp estática para consultar el registro de participantes (búsqueda, filtros por curso/grupo/unidad educativa, resaltado, tema claro/oscuro).

## Estructura

- `index.html`, `app.js`, `styles.css` — interfaz (sin dependencias, sin backend).
- `datos.js` — datos de los participantes (`const PARTICIPANTES = [...]`).
- `actualizar.py` — cruza el Excel exportado del formulario (Google Forms) con `datos.js` por C.I.: actualiza celular/unidad educativa, marca `reciente` y agrega los participantes nuevos.

## Actualizar participantes desde el Excel

Requiere Python 3 y `openpyxl` (`pip install openpyxl`).

```bash
python actualizar.py "REGISTRO_PARTICIPANTES___respuestas_.xlsx" --escribir
```

- Sin `--escribir` solo muestra el reporte (ACTUALIZADO / NUEVO) sin modificar nada.
- El Excel debe tener las columnas del formulario: marca temporal (0), apellidos (1–2), nombres (3), C.I. (4), celular (5), unidad educativa (6).

## Publicación

Sitio estático servido por GitHub Pages desde `main` (raíz del repo).
