# FONAG — SEDC (Sistema de Estandarización de Datos Crudos)

Portal web de monitoreo hidrometeorológico, telemetría en tiempo real y anuarios estadísticos del **FONAG (Fondo para la Protección del Agua)**.

---

## 📋 Prerrequisitos de Entorno

Antes de comenzar, asegúrate de tener instalado en tu sistema:

- **Node.js**: Versión `18.0.0` o superior (se recomienda v20 LTS).
- **npm**: Versión `9.0.0` o superior.
- **Git**: Para el control de versiones.

---

## 🚀 Guía de Instalación y Levantamiento Local

Sigue paso a paso estos comandos en tu terminal para clonar, configurar e iniciar la aplicación en tu entorno local:

### 1. Clonar el Repositorio

```bash
git clone git@github.com:webmasterft/fonag.git
cd fonag
```

### 2. Instalar Dependencias

Instala los paquetes y motores de desarrollo (Vite 6, Tailwind CSS v4, Leaflet, Chart.js, Embla Carousel):

```bash
npm install
```

### 3. Configurar Variables de Entorno (`.env`)

Crea un archivo `.env` en la raíz del proyecto para habilitar la autenticación automática del **Server Proxy de Vite** con la API en vivo del SEDC FONAG:

```env
# URL Base de la API Oficial de SEDC
SEDC_API_BASE_URL=https://sedc.fonag.org.ec

# Credenciales para Autenticación en el Proxy de Desarrollo
SEDC_USERNAME=tu_usuario
SEDC_PASSWORD=tu_contrasena
```

> [!NOTE]
> Las credenciales son obligatorias. Todos los datos provienen de la API del SEDC y **no existen datasets locales de respaldo**: si las credenciales son incorrectas o la API no responde, la aplicación muestra el mensaje "Error en el API, intenta más tarde.".
>
> Si la contraseña contiene `#`, escríbela entre comillas en `.env` (`SEDC_PASSWORD="..."`); de lo contrario dotenv la corta y el inicio de sesión falla.

### 4. Iniciar el Servidor de Desarrollo

Ejecuta el servidor local de desarrollo con hot-reload y proxy autenticado activo:

```bash
npm run dev
```

La aplicación estará disponible en la URL local:
👉 **`http://localhost:9000/`**

---

## 🛠️ Scripts Disponibles en `package.json`

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo de Vite en el puerto `9000` con proxy y HMR. |
| `npm run build` | Compila y optimiza la aplicación Multi-Page (MPA) para producción en la carpeta `dist/`. |
| `npm run preview` | Inicia un servidor HTTP local para previsualizar la compilación de producción de `dist/`. |

---

## 🗺️ Mapa de Rutas de la Aplicación (MPA)

| Ruta | Descripción | Entrada HTML |
| :--- | :--- | :--- |
| **`/`** | Landing Page Principal con mapa interactivo y cifras | `index.html` |
| **`/estaciones/`** | Visor y catálogo de Estaciones Hidroclimáticas | `estaciones/index.html` |
| **`/consultas/periodo/`** | Consulta de series de tiempo históricas por periodo | `consultas/periodo/index.html` |
| **`/consultas/anuario/`** | Anuario Hidroclimático con gráficas y tablas anuales | `consultas/anuario/index.html` |
| **`/tiempo-real/`** | Consulta de telemetría y sensores en tiempo real | `tiempo-real/index.html` |
| **`/contacto/`** | Formulario de contacto y ubicación de oficinas FONAG | `contacto/index.html` |

---

## 📖 Guía Completa de Extensión e Implementación para Desarrolladores

Para mantener la robustez, determinismo y coherencia de la plataforma (Atomic Design, Vanilla JS, Vite MPA y SDD), sigue minuciosamente los estándares de desarrollo detallados a continuación:

---

### 1. Agregar una Nueva Página o Vista (Vite MPA)
1. **Crear la Estructura HTML Semántica**: Crea una carpeta con su `index.html` (ej. `./reportes/index.html`). Define el `<header>` (Nav Portal), `<main>` y `<footer>`.
2. **Registrar la Entrada en Vite**: Abre `./vite.config.js` y añade el nuevo punto de entrada en `build.rollupOptions.input`:
   ```javascript
   reportes: resolve(__dirname, 'reportes/index.html')
   ```
3. **Crear Controlador JavaScript**: Crea `./src/js/pages/reportes.js` e impórtalo en la vista:
   ```html
   <script type="module" src="/src/js/pages/reportes.js"></script>
   ```

---

### 2. Convenciones de Estilos (CSS Tokens & Atomic Design)
Los estilos se organizan bajo la arquitectura de **Atomic Design** en `./src/css/`:
- **`tokens/`** (`variables.css`): Variables canónicas globales para colores (`--color-palette-navy`, `--color-brand-orange`), fuentes, radios (`--radius-14`) y escalas de espaciado. *Prohibido hardcodear colores hex directos.*
- **`atoms/`**: Reglas elementales reutilizables como botones (`.btn-primary`), campos de texto (`.form-input`), badges de estado (`.badge-tipo`) o pins del mapa.
- **`molecules/`**: Composiciones pequeñas como tarjetas de métricas (`.stat-card`), ítems de listas (`.constituent-item`) o selectores de filtros.
- **`organisms/`**: Layouts complejos de pantalla como la vista de contacto, el mapa principal (`.home-map-layout`) o rejillas de anuarios.
- **Registro**: Todo nuevo archivo `.css` creado debe importarse en `./src/css/main.css` respetando el orden de cascada.

---

### 3. Integración de Servicios, Endpoints y Resiliencia (Offline-First)

El desarrollo local utiliza las credenciales de `.env` (`SEDC_USERNAME`, `SEDC_PASSWORD`) a través del Proxy Inverso de Vite (`/api-sedc/`). La aplicación interactúa con los **5 servicios oficiales de la API del SEDC FONAG**:

#### Catálogo Oficial de Endpoints de la API SEDC

| # | Servicio | Método | Endpoint SEDC Remoto | Ruta Proxy Local | Autenticación |
|---|---|---|---|---|---|
| **01** | **Listado de Estaciones** | `GET` | `/estacion/list/` | `/api-sedc/estacion/list/` | Opcional (amplía información) |
| **02** | **Ubicación GeoJSON** | `GET` | `/point_geojson` | `/api-sedc/point_geojson` | Pública |
| **03** | **Catálogo de Variables** | `GET` | `/variable/<seccion>/list` | `/api-sedc/variable/<seccion>/list` | Requerida (sesión activa) |
| **04** | **Telemetría en Vivo** | `POST` | `/ajax/telemetria/consulta` | `/api-sedc/ajax/telemetria/consulta` | CSRF Token + Cookie (`csrftoken`) |
| **05** | **Datos Históricos por Periodo** | `POST` | `/reportes/consultas_periodo` | `/api-sedc/reportes/consultas_periodo` | Requerida + Permiso Periodo |

---

#### Detalles de Uso de la API en el Cliente (`./src/js/services/sedc-api.js`)

1. **`GET /estacion/list/` (Listado de Estaciones)**:
   - *Parámetros útiles*: `nombre`, `codigo`, `administrador` (`FONAG`, `EPMAPS`), `est_estado` (`true`/`false`), `order`, `limit`, `offset`.
   - *Uso*: Retorna el `est_id` necesario para consultar series históricas.

2. **`GET /point_geojson` (Mapa GeoJSON)**:
   - *Parámetros*: `section` (`hydroclimate`, `wetland`, `quality`, `soil`), `variable` (ej. `PRE`), `parameter`.
   - *Uso*: Capa de puntos georreferenciados para visualizar en Leaflet.

3. **`GET /variable/<seccion>/list` (Catálogo de Variables)**:
   - *Secciones*: `hidro` (hidroclimáticas), `humed` (humedales), `cagua` (calidad de agua), `suelo`, `isoto`.
   - *Uso*: Retorna el `var_id` y `var_codigo` requeridos para consultas por periodo.

4. **`POST /ajax/telemetria/consulta` (Telemetría en Tiempo Real)**:
   - *Body (form-data/json)*: `estacion` (ID estación), `inicio` (`YYYY-MM-DD`).
   - *Seguridad*: Requiere cabecera `X-CSRFToken` y cookie de sesión. Límite de 100 peticiones/hora por IP.

5. **`POST /reportes/consultas_periodo` (Datos Históricos por Periodo)**:
   - *Body*: `estacion` (`est_id`), `variable` (`var_id`), `frecuencia` (`1`=Sub-horario Crudo, `2`=Sub-horario Validado, `3`=Horario, `4`=Diario, `5`=Mensual, `6`=Anual), `fecha_inicio`, `fecha_fin`, `transmision`.
   - *Cabecera Obligatoria*: **`X-Requested-With: XMLHttpRequest`** (necesaria para recibir la respuesta en formato JSON en lugar de HTML).

---

#### Ejemplos de Implementación y Manejo de Errores

1. **Creación de Servicios de Red**:
   ```javascript
   export async function fetchSeriesDeTiempo(estacion, variable, fechaInicio, fechaFin, frecuencia) {
     const res = await fetch('/api/sedc/reportes/consultas_periodo', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ estacion, variable, frecuencia, fecha_inicio: fechaInicio, fecha_fin: fechaFin })
     });
     if (!res.ok) throw new Error(`Consulta no disponible (${res.status})`);
     return res.json();
   }
   ```

2. **Sin datos de respaldo**:
   Todos los datos provienen del SEDC. Ante fallos de red o de autenticación no se usan datasets locales ni datos simulados: la página muestra el estado de error compartido (`src/js/atoms/api-error.js`):
   ```javascript
   import { showApiError } from '../atoms/api-error.js';

   try {
     const series = await fetchSeriesDeTiempo(estacion, 1, '2026-01-01', '2026-10-01', 'diario');
     renderChart(series);
   } catch (error) {
     showApiError(container); // "Error en el API, intenta más tarde."
   }
   ```
   Los valores faltantes se muestran como `-`; nunca se reemplazan por valores por defecto.

3. **Datos geográficos locales**:
   - **Polígonos de Ejes de Trabajo (`./src/data/ejes_2026.json`)**: único archivo de datos local. Es geografía estática (GeoJSON `FeatureCollection` con los Ejes de Trabajo de FONAG), no un respaldo de la API.
     - *Cómo actualizarlo*: Reemplaza las coordenadas dentro de `geometry.coordinates` o los nombres en `properties.eje_trab`.

---

### 4. Construcción de Tablas Interactivas y Exportación (`table-core.js`)
Para mostrar tablas de datos paginadas, filtrables y ordenables sin frameworks:
1. **Lógica de Datos Inmutable**: Utiliza el motor puro `./src/js/molecules/data-table/table-core.js`:
   - `filterRows(rows, filters, searchFields)`: Filtra registros sin mutar el array original.
   - `sortRows(rows, key, direction)`: Ordena registros por columnas numéricas o texto.
   - `paginateRows(rows, page, pageSize)`: Calcula la página activa y devuelve la porción exacta de filas.
2. **Renderizado de DOM**: Emplea `./src/js/molecules/data-table/table-renderer.js` para inyectar semánticamente `<thead>`, `<tbody>` y controles de paginación.
3. **Exportación a CSV / Excel**: Dispara descargas automáticas llamando a:
   ```javascript
   import { exportRowsToCsv } from '/src/js/molecules/data-table/table-core.js';
   exportRowsToCsv(columnas, filasFiltradas, 'reporte_estaciones.csv');
   ```

---

### 5. Visualización de Gráficos Interactivos (Chart.js)
1. **Encapsulamiento de Instancias**: En las vistas telemétricas o de anuarios, encapsula la creación de gráficos con `Chart.js`.
2. **Destrucción Preventiva de Memoria**: Destruye la instancia previa antes de actualizar la gráfica para prevenir *memory leaks*:
   ```javascript
   if (miGraficoInstance) {
     miGraficoInstance.destroy();
   }
   miGraficoInstance = new Chart(ctx, config);
   ```

---

### 6. Mapas Geoespaciales e Interacción GIS (Leaflet)
1. **Contenedores de Mapa**: Define un elemento `<div id="map"></div>` con dimensiones explícitas en CSS.
2. **Carga de GeoJSON**: Para dibujar los 8 Ejes de Trabajo de FONAG o puntos de estaciones, importa `./src/data/ejes_2026.json` (polígonos) y dibuja las estaciones con los datos de `fetchEstaciones()` / `fetchPointGeojson()` en la capa Leaflet (`L.geoJSON` / `L.markerClusterGroup`).
3. **Controladores de Capas y Popups**: Diseña los popups usando templates HTML semánticos y vincúlalos a los eventos `click` de los marcadores.

---

### 7. Manejo de Estado, Componentes Globales y Paradigma de Programación
- **Interceptor HTTP Global y Loader (`src/js/atoms/global-loader.js`)**:
  - Intercepta automáticamente las peticiones `fetch` del cliente. Muestra una barra de progreso discreta y un widget animado (`Consultando servidor...`) durante las solicitudes activas.
  - *Para modificar el loader global*: Ajusta los elementos HTML creados en `ensureLoaderElement()` dentro de `global-loader.js` o sus estilos atómicos en `global-loader.css`.
- **Tema VisualFONAG Canónico (`src/js/organisms/theme-toggle.js`)**:
  - La plataforma está estandarizada bajo el tema claro oficial del FONAG (`data-theme` limpio y paleta canónica). `initThemeToggle()` resetea configuraciones heredadas.
- **Motor de Cálculo Espacial GIS en Cliente (`pointInPoly` / `getEjeForCoords`)**:
  - En la vista de catálogo (`estaciones.js`), la función matemática `pointInPoly()` evalúa dinámicamente en cliente las coordenadas `[longitud, latitud]` contra los polígonos GeoJSON (`ejes_2026.json`) para adscribir de forma determinista cada estación a su **Eje de Trabajo** real sin sobrecargar el servidor backend.
- **Programación Funcional e Inmutable**: Prohibido usar estado global mutable no controlado. Utiliza funciones puras para procesar datos de estaciones o filtros de fecha.
- **Manipulación Directa del DOM**: Selecciona elementos con `document.querySelector` o mantén referencias aisladas en las funciones inicializadoras de las páginas.

---

### 8. Gestión de Imágenes y Assets Estáticos
- **Directorio Public (`./public/`)**: Almacena logotipos corporativos y favicons que deban ser servidos directamente en la raíz de producción.
- **Assets Procesados (`./src/assets/`)**: Almacena iconos SVG, marcadores personalizados o imágenes importadas dinámicamente en los módulos JS o archivos CSS.

---

### 9. Incorporación de Librerías de Terceros
- Instala nuevas dependencias exclusivamente por **npm**:
  ```bash
  npm install nombre-libreria
  ```
- Importa la librería mediante módulos ES en el controlador correspondiente sin saturar el bundle global.

---

### 10. Metodología de Trabajo y Commits (SDD & Git)
1. **Spec-Driven Development (SDD)**: Antes de realizar cambios complejos en la arquitectura o interfaz, revisa y documenta la especificación del cambio en `openspec/changes/`.
2. **Mensajes de Commit Canónicos**: Utiliza strictly la convención de **Conventional Commits**:
   - `feat: ...` (Nuevas funcionalidades)
   - `fix: ...` (Corrección de errores)
   - `docs: ...` (Documentación)
   - `style: ...` (Ajustes visuales/CSS sin cambio de lógica)
   - `refactor: ...` (Reestructuración de código)
3. **Sin Firmas AI**: No añada pies de página tipo `Co-Authored-By` o notas automáticas de herramientas de IA en las contribuciones.

---

## 🏗️ Arquitectura Técnica Resumida

- **Arquitectura**: Multi-Page Application (MPA) basada en **Vite 6** y **Vanilla JS**.
- **Cero Frameworks Virtual DOM**: Manipulación directa y determinista del DOM sin jQuery ni React.
- **Diseño**: CSS Tokens canónicos + Atomic Design (`tokens/`, `atoms/`, `molecules/`, `organisms/`).
- **Datos 100% SEDC**: Consumo autenticado de la API sin datasets de respaldo; ante fallos se muestra un mensaje de error.

Para consultar la documentación técnica minuciosa dirigida a desarrolladores, lee el archivo [ARCHITECTURE.md](./ARCHITECTURE.md).
