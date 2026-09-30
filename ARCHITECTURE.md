# Arquitectura Técnica y Especificación de Ingeniería: FONAG SEDC

Documentación arquitectónica detallada y minuciosa para desarrolladores sobre la modernización de la plataforma web del **SEDC (Sistema de Estandarización de Datos Crudos Hidroclimáticos del FONAG - Fondo para la Protección del Agua)**.

---

## 1. Visión General y Principios Arquitectónicos

La aplicación se diseñó como un **Portal Web de Alto Rendimiento y Cero Dependencias Ruidosas**, concebido para servir como la interfaz oficial de consulta hidroclimática, telemetría y anuarios estadísticos de las cuencas que abastecen de agua al Distrito Metropolitano de Quito (DMQ).

### 1.1. Principios Fundamentales
1. **Concepts > Code**: Separación estricta de responsabilidades (SoC), modularidad limpia y diseño arquitectónico robusto antes que el uso irreflexivo de frameworks.
2. **Cero Runtimes Pesados (Vanilla JS)**: Erradicación total de jQuery, Bootstrap y virtual DOMs (React, Vue, Angular). El navegador ejecuta manipular directamente el DOM de manera determinista e inmutable.
3. **Arquitectura Multi-Page (MPA)**: Mapeo nativo de URLs del navegador con los puntos de entrada del servidor (`/`, `/estaciones/`, `/consultas/periodo/`, `/consultas/anuario/`, `/tiempo-real/`, `/contacto/`).
4. **Resiliencia API-First con Fallback Transparente**: La aplicación prioriza el consumo en vivo de la API autenticada del SEDC. En entornos offline o restricciones de credenciales, el cliente conmuta suavemente a datasets locales estáticos y sincronizados sin romper la experiencia de usuario.
### 1.2. Tech Stack (Pila Tecnológica Detallada)

| Capa / Categoría | Tecnología / Librería | Versión | Propósito Arquitectónico |
|---|---|---|---|
| **Core Client** | Vanilla JavaScript (ES6+ / ESM) | ECMAScript 2024 | Lógica de cliente reactiva funcional inmutable sin sobrecarga de virtual DOM. |
| **Markup Semántico** | HTML5 Standard + WAI-ARIA | HTML5 W3C | Estructura semántica accesible con migas de pan, landmarks y accesibilidad WCAG 2.2. |
| **Bundler & Dev Server** | Vite | `^6.2.0` | Empaquetador ultra-rápido ESM, soporte Multi-Page (MPA), HMR y Proxy HTTP Inverso. |
| **CSS Engine** | Vanilla CSS Tokens + Tailwind CSS Bridge | `^4.0.9` | Design tokens canónicos en `:root`, variables CSS nativas e integración modular. |
| **Cartografía Interactiva** | Leaflet.js | `^1.9.4` | Renderizado ligero de polígonos GeoJSON de Ejes y marcadores vectoriales interactivos. |
| **Visualización de Datos** | Chart.js | `^4.5.1` | Gráficos estadísticos de series de tiempo, precipitación, temperatura y humedad. |
| **Carrusel Component** | Embla Carousel | `^8.6.0` | Controlador fluido de carrusel con soporte para gestos táctiles y accesibilidad en socios. |
| **Calidad y Linting** | ESLint + Stylelint | `^10.10.0` / `^17.15.0` | Validación estática estricta de código JS y estándares CSS canónicos. |
| **Proxy API Inverso** | Node.js HTTPS Native Module | `v18+ / v20+` | Gestor de sesión persistente con autenticación `sessionid` y `csrftoken` contra SEDC. |
| **Despliegue & Hosting** | Vercel Platform | Clean URLs | Hosting global edge con soporte para rewrites y rutas limpias (`cleanUrls: true`). |

---

## 2. Estructura del Proyecto y Scaffolding

El proyecto sigue una estructura limpia de **Multi-Page Application (MPA)** gestionada por **Vite 6**:

```
./ (Raíz del Repositorio FONAG)
├── index.html                           # Entry point: Landing Page / Portal Principal
├── estaciones/
│   └── index.html                       # Entry point: Visor de Estaciones Hidroclimáticas
├── consultas/
│   ├── periodo/
│   │   └── index.html                   # Entry point: Consultas por Periodo y Gráficas
│   └── anuario/
│       └── index.html                   # Entry point: Anuario Hidroclimático Estadístico
├── tiempo-real/
│   └── index.html                       # Entry point: Telemetría en Vivo de Sensores
├── contacto/
│   └── index.html                       # Entry point: Formulario de Contacto y Ubicación
├── src/
│   ├── css/
│   │   ├── main.css                     # Punto de entrada CSS (Vite + CSS Tokens Bridge)
│   │   ├── tokens/                      # Tokens Canónicos de Diseño
│   │   │   ├── colors.css               # Paleta oficial FONAG (Navy #242857, Orange #F19001, Cyan #41A6E5)
│   │   │   ├── typography.css           # Inter Font (Pesos 400, 500, 600, 700, 800)
│   │   │   ├── spacing.css              # Escala modular de espaciados
│   │   │   ├── borders.css              # Radios de bordes (8px, 12px, 14px, 18px, full)
│   │   │   └── index.css                # Agregador central de tokens
│   │   ├── atoms/                       # Estilos de elementos indivisibles
│   │   │   ├── buttons.css              # Botones primarios, CTA naranja, outline
│   │   │   ├── inputs.css               # Inputs de texto, selectores, datepickers
│   │   │   ├── badges.css               # Chips de tipo de estación y estado
│   │   │   ├── icons-sprite.css         # Sprites e íconos SVG vectoriales
│   │   │   └── global-loader.css        # Indicador global de carga HTTP
│   │   ├── molecules/                   # Combinación de átomos
│   │   │   ├── nav-menu.css             # Navegación con dropdowns accesibles
│   │   │   ├── hero-search.css          # Estilos de búsqueda
│   │   │   ├── stat-card.css            # Tarjetas de cifras y métricas
│   │   │   ├── constituent-item.css     # Medallones institucionales
│   │   │   └── data-table.css           # Tablas de datos semánticas
│   │   ├── organisms/                   # Secciones complejas de la UI
│   │   │   ├── portal-header.css        # Navegación global del portal
│   │   │   ├── hero-portal.css          # Hero banner institucional
│   │   │   ├── home-map-section.css     # Sección de Mapa + Tarjeta lateral de Ejes
│   │   │   ├── periodo-view.css         # Layout split de Consultas por Periodo
│   │   │   ├── anuario-view.css         # Layout del Anuario Hidroclimático
│   │   │   ├── tiempo-real-view.css     # Layout de Telemetría en Vivo
│   │   │   ├── contacto-view.css        # Layout de Contacto y Formulario
│   │   │   └── footer.css               # Pie de página corporativo
│   │   └── templates/
│   │       └── layout.css               # Estructura del grid principal y contenedores (1366px)
│   ├── data/                            # Datasets Locales Sincronizados (Fallbacks)
│   │   ├── estaciones.json              # 61 estaciones hidroclimáticas activas oficiales
│   │   └── ejes_2026.json               # GeoJSON de Polígonos de los 8 Ejes de Trabajo FONAG
│   └── js/
│       ├── main.js                      # Controller: Landing Page
│       ├── atoms/
│       │   ├── button.js                # Ripple effect y accesibilidad en botones
│       │   └── global-loader.js         # Interceptor visual de peticiones HTTP
│       ├── molecules/
│       │   ├── datepicker/              # Componente custom DatePicker
│       │   ├── map/
│       │   │   └── leaflet-map.js       # Controlador modular del Mapa Leaflet (GeoJSON + Markers)
│       │   ├── charts/
│       │   │   ├── periodo-charts.js    # Renderizador Chart.js para Series de Tiempo
│       │   │   └── anuario-charts.js    # Renderizador Chart.js para Estadísticas Anuales
│       │   └── data-table/              # MOTOR FUNCIONAL DE TABLAS DE DATOS
│       │       ├── table-core.js        # Lógica pura de filtrado, ordenación, paginación y CSV/XLSX
│       │       ├── table-renderer.js    # Generación pura de elementos DOM
│       │       └── anuario-table.js     # Tablas divididas por variable para el Anuario
│       ├── organisms/
│       │   ├── home-map.js              # Orquestador del mapa e interacción de Ejes en la Home
│       │   ├── theme-toggle.js          # Gestor de tema claro/oscuro
│       │   └── constituents-carousel.js # Controlador de Embla Carousel
│       ├── services/                    # CAPA DE SERVICIOS Y API INTEGRACIÓN
│       │   ├── estaciones-service.js    # Consumo de red de estaciones (Live API + Fallback)
│       │   ├── periodo-service.js       # Consumo de series históricas por periodo
│       │   ├── anuario-service.js       # Consumo de resúmenes estadísticos anuales
│       │   └── telemetria-service.js    # Consumo de lecturas telemétricas en tiempo real
│       └── pages/                       # Controllers por Entrada MPA
│           ├── estaciones.js            # Controller: /estaciones/
│           ├── periodo.js               # Controller: /consultas/periodo/
│           ├── anuario.js               # Controller: /consultas/anuario/
│           ├── tiempo-real.js           # Controller: /tiempo-real/
│           └── contacto.js              # Controller: /contacto/
├── vite.config.js                       # Configuración MPA + Server Proxy Autenticado SEDC
├── vercel.json                          # Configuración de despliegue y Clean URLs
└── package.json                         # Scripts y dependencias del proyecto
```

---

## 3. Especificación HTML5 Semántico y Accesibilidad (a11y)

Todas las vistas de la aplicación cumplen con **WCAG 2.2** y estructura semántica estricta:

1. **Jerarquía Única de Encabezados**:
   - Cada página contiene un único elemento `<h1>` representativo (`Datos en Tiempo Real`, `Consultas por Periodo`, `Estaciones Hidroclimáticas`).
   - Jerarquía descendente sin saltos de nivel (`<h1>` -> `<h2>` -> `<h3>`).
2. **Landmarks Semánticos**:
   - `<header class="portal-header">`: Encabezado global y navegación.
   - `<nav aria-label="...">`: Migas de pan y menús principales.
   - `<main>`: Contenedor primario de la vista.
   - `<section>` y `<article>`: Secciones de tarjetas y bloques de mapas.
   - `<footer>`: Pie de página corporativo de dos niveles.
3. **Controles Interactivos y Form Formularios**:
   - Todos los campos de entrada (`<input>`, `<select>`) tienen asociadas etiquetas explícitas `<label for="...">`.
   - Modales interactivos con `role="dialog"`, `aria-modal="true"`, foco contenido y cierre vía tecla `Escape`.
   - Botones con atributos `aria-label` en controles de icono solo (`close`, `zoom`, `descarga`).

---

## 4. Arquitectura CSS: Tokens y Atomic Design

El sistema visual está construido en Vanilla CSS utilizando **Custom Properties (CSS Variables)** y principios de **Atomic Design**.

### 4.1. Design Tokens (`src/css/tokens/`)
Las constantes del sistema de diseño se declaran centralizadamente en `:root`:

```css
:root {
  /* Paleta Canónica FONAG */
  --color-palette-navy: #242857;          /* Azul Primario Corporativo */
  --color-palette-navy-hover: #1e2347;
  --color-brand-orange: #F19001;          /* Naranja Acento / CTA */
  --color-brand-orange-hover: #d97f00;
  --color-brand-cyan: #41A6E5;            /* Cian Datos / Agua */

  /* Tipografía */
  --font-family-sans: 'Inter', system-ui, -apple-system, sans-serif;
  
  /* Escala de Espaciado Modular */
  --spacing-1: 0.25rem; /* 4px */
  --spacing-2: 0.5rem;  /* 8px */
  --spacing-3: 0.75rem; /* 12px */
  --spacing-4: 1.00rem; /* 16px */
  --spacing-6: 1.50rem; /* 24px */
  --spacing-8: 2.00rem; /* 32px */

  /* Radios de Bordes */
  --radius-8: 8px;      /* Botones e inputs */
  --radius-12: 12px;    /* Tarjetas pequeñas y badges */
  --radius-14: 14px;    /* Tarjetas de filtros y modales */
  --radius-18: 18px;    /* Contenedores de mapa y hero */
  --radius-full: 9999px;/* Pill badges y botones circulares */

  /* Layout Boundaries */
  --container-max-width: 1366px;
}
```

### 4.2. Estructura Atómica
- **Átomos (`src/css/atoms/`)**: Reglas de estilos elementales como `.btn`, `.btn-primary`, `.form-input`, `.badge-tipo`, `.station-pin`.
- **Moléculas (`src/css/molecules/`)**: Composiciones como `.nav-menu`, `.stat-card`, `.periodo-station-pill`, `.anuario-grid-table`.
- **Organismos (`src/css/organisms/`)**: Layouts complejos como `.home-map-layout`, `.periodo-split-layout`, `.portal-header`, `.periodo-filter-card`.

---

## 5. Paradigmas Javascript: Programación Funcional y Motor de Tablas

### 5.1. Paradigma Funcional Inmutable
Se prohíbe el uso de estado global mutable descontrolado. La lógica de filtrado y transformación utiliza funciones puras:

```javascript
// Ejemplo: Filtrado puro de estaciones en periodo.js
const filtered = allEstaciones.filter((est) => {
  const matchPeriod = !est.fechaInicio || est.fechaInicio <= eDate;
  const matchVar = estacionTieneVariable(est, varCode);
  const matchEje = (activeEje === 'ALL') || (est.ejeCalculado?.toUpperCase() === activeEje.toUpperCase());
  const matchTipo = !qTipo || est.tipo.toLowerCase() === qTipo.toLowerCase();
  const matchCodigo = !qCodigo || est.codigo.toLowerCase().includes(qCodigo);
  const matchNombre = !qNombre || est.nombre.toLowerCase().includes(qNombre);

  return matchVar && matchEje && matchTipo && matchCodigo && matchNombre && matchPeriod;
});
```

### 5.2. Motor Funcional de Tablas (`src/js/molecules/data-table/table-core.js`)
El motor de tablas no acopla la lógica al DOM:

```
[Dataset Inmutable] ──> [table-core.js (Filtro / Ordenación / Paginación Pura)]
                              │
                              ▼
                     [table-renderer.js (Generación de DOM HTML Semántico)]
                              │
                              ▼
                     [Vistas / Modales del Portal]
```

1. **`filterRows(rows, filters, searchFields)`**: Genera un nuevo array filtrado sin modificar el original.
2. **`sortRows(rows, key, direction)`**: Ordena inmutablemente por claves simples o compuestas.
3. **`paginateRows(rows, page, pageSize)`**: Computa los slices exactos e índices de paginación.
4. **`exportRowsToCsv(columns, rows, filename)` / `exportAnuarioCsv`**: Genera archivos estructurados RFC4180 CSV o planillas Excel (`.xlsx`) y dispara la descarga cliente nativa vía Blob.

---

## 6. Arquitectura de Integración API & Proxy de Desarrollo

Para conectar con la infraestructura autenticada del backend Django del **SEDC FONAG** (`https://sedc.fonag.org.ec`), se construyó una arquitectura de **Proxy Inverso Autenticado en el Servidor de Desarrollo** (`vite.config.js`).

### 6.1. Diagrama de Secuencia de Peticiones HTTP

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Frontend (Vanilla JS)
    participant Proxy as Vite Server Proxy (Node.js)
    participant Auth as Auth Manager (vite.config.js)
    participant SEDC as Backend SEDC FONAG (sedc.fonag.org.ec)

    Cliente->>Proxy: POST /api/sedc/telemetria/consulta (Body: {estacion: "1", inicio: "2026-09-01"})
    Note over Proxy,Auth: Verifica validez de galleta de sesión
    alt Sesión expirada o no iniciada
        Auth->>SEDC: GET /login/
        SEDC-->>Auth: 200 OK (Set-Cookie: csrftoken=...)
        Auth->>SEDC: POST /login/ (Body: username, password, csrftoken)
        SEDC-->>Auth: 302 Found (Set-Cookie: sessionid=..., csrftoken=...)
    end
    Proxy->>SEDC: POST /telemetria/consulta (Header: Cookie: csrftoken=...; sessionid=...)
    SEDC-->>Proxy: 200 OK (JSON con mediciones reales)
    Proxy-->>Cliente: 200 OK (JSON en vivo)
```

### 6.2. Seguridad de Credenciales y Entorno
1. **Aislamiento en `.env`**: Las credenciales (`SEDC_USERNAME`, `SEDC_PASSWORD`) se configuran únicamente en variables de entorno sin el prefijo `VITE_`.
2. **Protección contra fugas**: Al no usar el prefijo `VITE_`, las contraseñas residen exclusivamente en el runtime de Node.js en el proxy y nunca se empaquetan en el cliente frontend.

### 6.3. Catálogo de Servicios SEDC Integrados

| # | Servicio | Endpoint SEDC Remoto | Ruta Proxy Local | Formato |
|---|---|---|---|---|
| **01** | **Red de Estaciones** | `/informacion_red/list/` | `/api/sedc/informacion_red/list/` | JSON List |
| **02** | **Series por Periodo** | `/reportes/consultas_periodo` | `/api/sedc/reportes/consultas_periodo` | JSON Graph Data |
| **03** | **Telemetría en Vivo** | `/telemetria/consulta` | `/api/sedc/telemetria/consulta` | JSON Sensor Data |

---

## 7. Estrategia de Fallbacks Resilientes (Offline-First)

Para asegurar la disponibilidad operativa continua cuando el backend del SEDC no está accesible, requiere autenticación manual o en entornos de demostración sin conexión:

1. **`src/data/estaciones.json`**: Dataset estático que contiene las **61 estaciones hidroclimáticas activas oficiales** (17 Meteorológicas, 24 Pluviométricas y 20 Hidrológicas).
2. **`src/data/ejes_2026.json`**: Polígonos GeoJSON de los **8 Ejes de Trabajo** de FONAG (*Antisana, Pita, Pichincha Atacazo, Nororiente DMQ, Papallacta - Oyacachi, San Pedro, Alto Pita, Noroccidente*).
3. **Mecanismo Graceful Degradation en Servicios**:
   - `fetchEstaciones()` intenta consultar el proxy en vivo. Si responde `403` o falla la red, importa dinámicamente `estaciones.json`.
   - `fetchAnuarioEstadistico()` conmuta al generador de promedios deterministas `getAnuarioEstadistico()`.
   - `fetchTelemetriaReal()` conmuta al motor determinista telemétrico `mockSeries`.

---

## 8. Metodología de Desarrollo: Spec-Driven Development (SDD)

El desarrollo del portal siguió rigurosamente **Spec-Driven Development (SDD)**:

1. **Especificación Formal de Cambios**: Cada iteración visual o lógica se documenta mediante artefactos en `openspec/changes/`.
2. **Garantía de Regresión**: Ninguna funcionalidad previa se altera sin actualización de la especificación técnica.
3. **Flujo de Ejecución**:
   - `sdd-explore`: Análisis del código base y requerimientos.
   - `sdd-propose` / `sdd-spec`: Definición de deltas arquitectónicos.
   - `sdd-apply`: Implementación atómica del código.
   - `sdd-verify`: Validación visual en navegador y pruebas de compilación (`vite build`).

---

## 9. Scripts de Compilación y Calidad

El proyecto incluye comandos de automatización en `package.json`:

- `npm run dev`: Inicia el servidor de desarrollo Vite en `http://localhost:9000/` con Proxy SEDC activo.
- `npm run build`: Ejecuta la compilación de producción Multi-Page Application (MPA) optimizando bundles JS/CSS.
- `npm run preview`: Sirve la build de producción localmente para pruebas de rendimiento.

---

## 10. Detalle y Configuración del Repositorio Git

### 10.1. Identificación del Repositorio
- **Nombre del Repositorio**: `fonag`
- **URL Remota (SSH)**: `git@github.com:webmasterft/fonag.git`
- **URL Remota (HTTPS)**: `https://github.com/webmasterft/fonag.git`
- **Rama Principal de Producción**: `main`

### 10.2. Convenciones de Control de Versiones
1. **Conventional Commits**: Todos los commits siguen el estándar canónico de mensajes (`feat: ...`, `fix: ...`, `docs: ...`, `style: ...`, `refactor: ...`, `perf: ...`).
2. **Cero Atribución AI**: Se prohíbe el uso de pie de página "Co-Authored-By" o firmas automáticas en los mensajes de commit.
3. **Flujo de Integración**: Pushes directos y Pull Requests validados mediante compilación limpia de Vite (`npm run build`).

