# FONAG — SEDC (Sistema de Estandarización de Datos Crudos)

Portal web de monitoreo hidrometeorológico, telemetría en tiempo real y anuarios estadísticos del **FONAG (Fondo para la Protección del Agua)**. Todos los datos provienen en vivo de la API Django del SEDC (`https://sedc.fonag.org.ec`).

---

## 📋 Prerrequisitos de Entorno

Antes de comenzar, asegúrate de tener instalado en tu sistema:

- **Node.js**: Versión `18.0.0` o superior (se recomienda v20 LTS).
- **npm**: Versión `9.0.0` o superior.
- **Git**: Para el control de versiones.

---

## 🚀 Guía de Instalación y Levantamiento Local

### 1. Clonar el Repositorio

```bash
git clone git@github.com:webmasterft/fonag.git
cd fonag
```

### 2. Instalar Dependencias

Instala los paquetes (Vite 6, Tailwind CSS v4, Leaflet, Plotly, Chart.js, Embla Carousel):

```bash
npm install
```

`npm install` ejecuta además el script `prepare` (`git config core.hooksPath .githooks`), que activa el hook **pre-commit** del repositorio (ver [Control de credenciales](#-control-de-credenciales-pre-commit)).

### 3. Configurar Variables de Entorno (`.env`)

Crea un archivo `.env` en la raíz del proyecto. El proxy de desarrollo de Vite inicia sesión en SEDC con estas credenciales:

```env
# URL base de la API oficial de SEDC (opcional; por defecto https://sedc.fonag.org.ec)
SEDC_API_BASE_URL=https://sedc.fonag.org.ec

# Credenciales SEDC (obligatorias)
SEDC_USERNAME=tu_usuario
SEDC_PASSWORD=tu_contrasena
```

> [!NOTE]
> Las credenciales son obligatorias y **solo** se leen de variables de entorno: nunca se escriben en el código ni tienen valores por defecto. No existen datasets locales de respaldo: si las credenciales son incorrectas o la API no responde, la aplicación muestra el mensaje compartido "Error en el API, intenta más tarde.".
>
> Si la contraseña contiene `#`, escríbela entre comillas en `.env` (`SEDC_PASSWORD="..."`); de lo contrario dotenv la corta y el inicio de sesión falla.

En producción (Vercel) las mismas variables (`SEDC_USERNAME`, `SEDC_PASSWORD` y opcionalmente `SEDC_API_BASE_URL`) se configuran en **Project Settings → Environment Variables**; tras agregarlas hay que desplegar nuevamente.

### 4. Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en 👉 **`http://localhost:9000/`**

---

## 🛠️ Scripts Disponibles en `package.json`

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Servidor de desarrollo de Vite en el puerto `9000` con el proxy SEDC y HMR. |
| `npm run build` | Compila la aplicación Multi-Page (MPA) para producción en `dist/`. |
| `npm run preview` | Sirve localmente la compilación de `dist/`. |
| `npm run lint` | Ejecuta `lint:css` (Stylelint sobre `src/css`) y `lint:js`. |
| `npm run lint:js` | ESLint sobre `src/js`, `api/`, `scripts/` y `vite.config.js` (incluye `no-undef`). |
| `npm run check:secrets` | Revisa todos los archivos versionados en busca de credenciales escritas en el código. |

---

## 🗺️ Mapa de Rutas de la Aplicación (MPA)

| Ruta | Descripción | Entrada HTML |
| :--- | :--- | :--- |
| **`/`** | Portada con mapa interactivo y "Cifras del Portal" | `index.html` |
| **`/estaciones/`** | Catálogo de Estaciones Hidroclimáticas | `estaciones/index.html` |
| **`/consultas/periodo/`** | Series de tiempo por periodo | `consultas/periodo/index.html` |
| **`/consultas/anuario/`** | Anuario Hidroclimático (figuras, tablas y Excel oficial de SEDC) | `consultas/anuario/index.html` |
| **`/tiempo-real/`** | Telemetría en tiempo real | `tiempo-real/index.html` |
| **`/contacto/`** | Formulario de contacto y ubicación de oficinas FONAG | `contacto/index.html` |

---

## 📖 Guía de Extensión e Implementación para Desarrolladores

### 1. Agregar una Nueva Página o Vista (Vite MPA)
1. **Crear la estructura HTML semántica**: crea una carpeta con su `index.html` (ej. `./reportes/index.html`) con `<header>`, `<main>` y `<footer>`.
2. **Registrar la entrada en Vite**: añade el punto de entrada en `build.rollupOptions.input` de `./vite.config.js`:
   ```javascript
   reportes: resolve(__dirname, 'reportes/index.html')
   ```
3. **Crear el controlador JavaScript**: crea `./src/js/pages/reportes.js` e impórtalo en la vista:
   ```html
   <script type="module" src="/src/js/pages/reportes.js"></script>
   ```

---

### 2. Convenciones de Estilos (CSS Tokens & Atomic Design)
Los estilos se organizan bajo **Atomic Design** en `./src/css/`:
- **`tokens/`** (`colors.css`, `typography.css`, `spacing.css`, agregados en `index.css`): variables globales de color, tipografía y espaciado.
- **`atoms/`**: botones, inputs, badges, sprites y `loader.css` (loader de la app y estado de error de la API).
- **`molecules/`**: tarjetas de métricas, ítems de socios, datepicker, tablas.
- **`organisms/`**: header, hero, mapa de la portada y layouts de cada vista.
- **Registro**: todo nuevo archivo `.css` debe importarse en `./src/css/main.css` respetando el orden de cascada.
- El portal usa solo el **tema claro** (no hay modo oscuro ni selector de tema).

---

### 3. Integración con la API SEDC

El cliente llama siempre a rutas propias `/api/sedc/*` (mismo origen). Esas rutas se resuelven así:

| Entorno | Quién atiende `/api/sedc/*` |
| :--- | :--- |
| **Desarrollo** (`npm run dev`) | Middleware de `vite.config.js`, que ejecuta **las mismas funciones** de `api/*.js` (y `api/_lib/sedc.js`) que usa Vercel. Lee `SEDC_*` de `.env`. |
| **Producción** (Vercel) | `vercel.json` reescribe cada ruta a su Serverless Function en `api/`; todas comparten `api/_lib/sedc.js` (login Django + CSRF, caché de sesión de 30 min). |

Así desarrollo y producción comparten una sola implementación: mismos campos enviados a SEDC, misma validación y mismas exportaciones.

#### Catálogo de Endpoints

| Servicio | Ruta del cliente | Función (`api/`) | Endpoint SEDC | Autenticación |
|---|---|---|---|---|
| Listado de estaciones | `GET /api/sedc/estacion/list/` | `estaciones.js` | `GET /estacion/list/` | Sesión (sin sesión SEDC omite `est_id` / `eje_trabajo`) |
| Catálogo de variables | `GET /api/sedc/variable/<seccion>/list` | `variables.js` | `GET /variable/<seccion>/list` | Sesión |
| Estaciones por variable | `GET /api/sedc/point_geojson` | — (rewrite directo a SEDC) | `GET /point_geojson` | Pública |
| Anuario hidroclimático | `POST /api/sedc/hydro_annual` | `hydro-annual.js` | `POST /hydro_annual` | Sesión + CSRF |
| Telemetría | `POST /api/sedc/telemetria/consulta` | `telemetria.js` | `POST /ajax/telemetria/consulta` | Sesión + CSRF |
| Consultas por periodo | `POST /api/sedc/reportes/consultas_periodo` | `periodo.js` | `POST /reportes/consultas_periodo` | Sesión + CSRF |

Notas por endpoint:

1. **`/estacion/list/`**: parámetros permitidos `nombre`, `codigo`, `administrador`, `est_estado`, `order`, `limit`, `offset`, `year` (por defecto `administrador=1`, `limit=300`).
2. **`/variable/<seccion>/list`**: `seccion` solo admite letras y `_` (`hidro`, `humed`, `cagua`, `suelo`...); cualquier otro valor responde `400`.
3. **`/point_geojson`**: `section=hydroclimate&variable=<var_codigo>`; se usa para saber qué estaciones miden una variable.
4. **`/hydro_annual`**: body `{ stations: [filas completas de /estacion/list/], year, export? }`. Con `export: true` devuelve el Excel oficial.
5. **`/ajax/telemetria/consulta`**: body `{ estacion, inicio }`. SEDC **solo** acepta la fecha de inicio (no hay fecha de fin): la vista Tiempo Real ofrece un único filtro "Fecha inicio" (por defecto, hoy).
6. **`/reportes/consultas_periodo`**: body `{ estacion, variable, frecuencia, fecha_inicio, fecha_fin, export? }` con `frecuencia` `2`=Subhorario validado, `3`=Horario, `4`=Diario, `5`=Mensual, `6`=Anual. Con `export: true` devuelve el archivo oficial (CSV subhorario o Excel).

La función reenvía a SEDC lo que envió el cliente (cadena vacía si falta), sin valores inventados. Para JSON envía `X-Requested-With: XMLHttpRequest`; para exportaciones lo omite y pasa el archivo tal cual (`content-type` y `content-disposition` de Django). Las funciones no envían cabeceras CORS: solo se llaman desde el mismo origen. Sin credenciales responden `502`; con un método distinto, `405`.

#### Manejo de errores (sin respaldos)
Ante fallos de red o de autenticación no se usan datasets locales ni datos simulados: la página muestra el estado de error compartido de `src/js/atoms/api-error.js`:

```javascript
import { showApiError, apiErrorHtml, API_ERROR_MESSAGE } from '../atoms/api-error.js';

try {
  const series = await fetchSeriesDeTiempo(estacion, 'PRE', '2026-01-01', '2026-10-01', 'diario');
  renderPeriodoChart(canvas, series, varCfg, 'diario');
} catch (error) {
  showApiError(container); // "Error en el API, intenta más tarde."
}
```

- Los valores individuales faltantes se muestran como `-` (`displayValue()` de `src/js/atoms/escape-html.js`); nunca se reemplazan por valores por defecto.
- Si falla una descarga oficial (Excel/CSV de SEDC) se muestra `alert(API_ERROR_MESSAGE)`; no se genera un archivo sustituto en el cliente.
- Los contadores y cifras del HTML arrancan en `-` y se llenan con los datos de la API.

#### Datos geográficos locales
- **`./src/data/ejes_2026.json`**: único archivo de datos local. Es geografía estática (GeoJSON con los polígonos de los Ejes de Trabajo), no un respaldo de la API. El eje de cada estación viene de `eje_trabajo` en la API.

---

### 4. Seguridad en el DOM (`escape-html.js`)
Todo texto que viene de la API (nombres, códigos, opciones de selects, celdas, popups del mapa) se inserta con `escapeHtml()` o `displayValue()` de `src/js/atoms/escape-html.js` antes de usar `innerHTML`. El markup estático propio no se escapa.

```javascript
import { escapeHtml, displayValue } from '../atoms/escape-html.js';

card.innerHTML = `<span data-codigo="${escapeHtml(est.codigo)}">${displayValue(est.nombre)}</span>`;
```

---

### 5. Tablas y Exportación
- **Catálogo de estaciones** (`src/js/pages/estaciones.js`): filtrado, ordenamiento y paginación en el controlador de la página; visibilidad de columnas con `src/js/molecules/data-table/column-filter.js`; descarga CSV del listado recibido de la API.
- **Anuario** (`src/js/molecules/charts/anuario-sedc.js`): tablas mensuales construidas con la respuesta de `/hydro_annual`; el Excel es el oficial de SEDC (`downloadAnuarioExcel`).
- **Periodo**: descarga oficial de SEDC (`downloadPeriodoExport`).
- **Tiempo Real**: SEDC no ofrece exportación de telemetría, por lo que "Descargar datos" genera en el cliente un CSV con las lecturas reales recibidas (`exportarSerieCsv`).

---

### 6. Gráficos (Plotly de SEDC + Chart.js secundario)
1. **Plotly (principal)**: las figuras se dibujan con la figura Plotly que devuelve SEDC (`grafico` en periodo, `graph` en anuario) o con la que se arma a partir de la telemetría como en Django (`telemetria-figure.js`). Plotly se carga de forma diferida con `src/js/atoms/plotly-loader.js`.
2. **Chart.js (secundario)**: `periodo-charts.js` solo lo usa cuando una serie no trae figura de SEDC.
3. Destruye siempre la instancia previa (`destroyPeriodoChart()` / `destroyAnuarioSedc()`) antes de dibujar otra.

---

### 7. Mapas (Leaflet)
- `src/js/molecules/map/leaflet-map.js` (`initLeafletMap`) es el mapa de Anuario, Periodo y Tiempo Real; `src/js/organisms/home-map.js` es el de la portada.
- Ambos usan la misma configuración visual exportada por `leaflet-map.js` (`EJES_CONFIG`, `TYPE_COLORS`) y los polígonos de `ejes_2026.json`.
- Las estaciones vienen de `fetchEstaciones()`; los popups escapan todos los datos de la API.

---

### 8. Componentes Globales
- **Loaders (`src/js/atoms/global-loader.js`)**: `initGlobalHttpLoader()` intercepta `fetch` y muestra la barra de progreso y la tarjeta "Consultando servidor..."; `showInlineLoader(container)` muestra el mismo loader dentro de un contenedor (modales, mapa) y devuelve la función para quitarlo. Estilos en `src/css/atoms/loader.css`.
- **Error de la API (`src/js/atoms/api-error.js`)**: `API_ERROR_MESSAGE`, `apiErrorHtml()`, `showApiError()`.
- **Escape de HTML (`src/js/atoms/escape-html.js`)**: `escapeHtml()`, `displayValue()`.
- **Cifras del Portal (`src/js/organisms/portal-stats.js`)**: estaciones, estaciones con telemetría, variables y años de registro calculados con la API (reutiliza la misma petición de estaciones que el mapa de la portada).
- **Tema (`src/js/organisms/theme-toggle.js`)**: fuerza el tema claro y limpia configuraciones heredadas.

---

### 9. Imágenes y Assets
- Las imágenes viven en `./src/images/` y se importan desde HTML/CSS para que Vite las procese.

---

### 10. 🔒 Control de credenciales (pre-commit)
- `.githooks/pre-commit` ejecuta `node scripts/check-secrets.js` sobre los cambios en stage y bloquea el commit si detecta credenciales escritas en el código (valores por defecto escritos junto a las variables `SEDC_*`, contraseñas literales o URLs con usuario y clave).
- El hook se activa con `npm install` (script `prepare`). Para revisar todo el repositorio: `npm run check:secrets`.

---

### 11. Metodología de Trabajo y Commits (SDD & Git)
1. **Spec-Driven Development (SDD)**: antes de cambios complejos, documenta la especificación en `openspec/changes/`.
2. **Conventional Commits**: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`.
3. **Sin firmas AI**: no añadas pies de página tipo `Co-Authored-By` ni notas automáticas de herramientas de IA.

---

## 🏗️ Arquitectura Técnica Resumida

- **Arquitectura**: Multi-Page Application (MPA) con **Vite 6** y **Vanilla JS** (ES modules).
- **Backend propio mínimo**: Serverless Functions de Vercel en `api/` (+ `api/_lib/sedc.js`), reutilizadas por el proxy de desarrollo de `vite.config.js`.
- **Diseño**: CSS Tokens + Atomic Design (`tokens/`, `atoms/`, `molecules/`, `organisms/`).
- **Datos 100% SEDC**: sin datasets de respaldo; ante fallos se muestra el error compartido.

Para la documentación técnica detallada, lee [ARCHITECTURE.md](./ARCHITECTURE.md).
