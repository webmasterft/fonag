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
> Si no configuras las credenciales del SEDC o trabajas offline, la aplicación activará automáticamente el **mecanismo de resiliencia con datasets locales estáticos** de las 61 estaciones oficiales, garantizando que el mapa, las consultas y la telemetría funcionen al 100%.

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

## 📖 Guía de Extensión e Implementación para Desarrolladores

Para extender la plataforma manteniendo la coherencia arquitectónica (Atomic Design, Vanilla JS y Vite MPA), sigue las convenciones establecidas a continuación:

### 1. Agregar una Nueva Página (MPA)
1. **Crear la vista HTML**: Añade una carpeta con un `index.html` en la raíz (ejemplo: `./reportes/index.html`).
2. **Registrar la entrada en Vite**: Abre `./vite.config.js` y agrega el nuevo punto de entrada en `build.rollupOptions.input`:
   ```javascript
   reportes: resolve(__dirname, 'reportes/index.html')
   ```
3. **Crear su controlador JS**: Crea el archivo de lógica en `./src/js/pages/reportes.js` e impórtalo en el `<script type="module" src="/src/js/pages/reportes.js"></script>` del `index.html`.

### 2. Agregar Estilos (Atomic Design & CSS Tokens)
1. **Identificar la categoría**:
   - `tokens/`: Variables canónicas (colores, fuentes, sombras).
   - `atoms/`: Botones, inputs, badges.
   - `molecules/`: Tarjetas de información, ítems de listas, grupos de controles.
   - `organisms/`: Layouts completos de página, barras laterales, mapas complejos.
2. **Importar en main.css**: Agrega el nuevo archivo CSS en `./src/css/main.css` respetando el orden de cascada.

### 3. Agregar Nuevas Funciones y Endpoints / APIs
1. **Definir la llamada a la API**: Añade la función en `./src/js/services/sedc-api.js` o `./src/js/services/api.js`. Usa siempre `SEDC_API_BASE_URL` o el proxy `/api-sedc/` para desarrollo.
2. **Implementar Resiliencia (Fallback)**: Si el endpoint de red falla, proporciona un dataset o estructura por defecto:
   ```javascript
   try {
     const data = await fetchEndpoint('/mi-nuevo-endpoint');
     return data;
   } catch (error) {
     console.warn('Usando dataset estático de respaldo');
     return DATASET_FALLBACK;
   }
   ```

### 4. Crear Gráficos y Tablas Interactivos
1. **Gráficos (Chart.js)**: Utiliza `Chart.js` y encapsula su instanciación en `./src/js/components/` o dentro de la página correspondiente. Asegúrate de destruir la instancia previa (`chartInstance.destroy()`) antes de re-renderizar datos nuevos.
2. **Tablas**: Estructura las tablas con semántica HTML5 (`<thead>`, `<tbody>`) y aplica las clases atómicas de `./src/css/atoms/` para formatear filas y celdas.

### 5. Agregar Imágenes y Recursos Estáticos
- **Imágenes públicas**: Coloca logotipos o assets estáticos en la carpeta `./public/` y haz referencia a ellos mediante `/nombre-imagen.png`.
- **Assets procesados**: Para recursos importados por JS o CSS, guárdalos en `./src/assets/`.

### 6. Incorporar Nuevas Librerías
- Instala dependencias únicamente mediante **npm**:
  ```bash
  npm install nombre-libreria
  ```
- Impórtala como módulo ES en el controlador de la página que la requiera:
  ```javascript
  import Libreria from 'nombre-libreria';
  ```

---

## 🏗️ Arquitectura Técnica Resumida

- **Arquitectura**: Multi-Page Application (MPA) basada en **Vite 6** y **Vanilla JS**.
- **Cero Frameworks Virtual DOM**: Manipulación directa y determinista del DOM sin jQuery ni React.
- **Diseño**: CSS Tokens canónicos + Atomic Design (`tokens/`, `atoms/`, `molecules/`, `organisms/`).
- **Resiliencia**: Consumo API-First autenticado con fallback transparente a datasets de 61 estaciones oficiales.

Para consultar la documentación técnica minuciosa dirigida a desarrolladores, lee el archivo [ARCHITECTURE.md](./ARCHITECTURE.md).
