# Specification: Anuario Hidroclimático Component

## 1. Overview
Full annual statistical reporting view (`/consultas/anuario/`) combining year selection, territorial map navigation, interactive station cards, and detail modal with Chart.js analytics and monthly tables.

## 2. Visual & Structural Specifications

### 2.1 Year Control Bar
- Dropdown selector (`2007` to `2026`).
- Year completion warning for ongoing year (2026).
- Download compiled dataset button (`Descargar copilado [Año]`).

### 2.2 Filter Card & Map Integration
- Filters for Código, Nombre, and Tipo de Estación.
- "Limpiar" action button and total counter (`X estaciones`).
- Split layout:
  - Left: Interactive Leaflet map with 9 territorial axis polygons, category marker colors (Meteo `#f59e0b`, Pluvio `#8b5cf6`, Hidro `#38bdf8`), and floating type legend card (`#anuario-map-tipo-legend`).
  - Right: Scrollable cards column (`#stations-cards-list`).

### 2.3 Station Detail Modal
- Header: Type badge, station code, name, axis name, elevation, year.
- Navigation Tabs:
  1. **Gráficas estadísticas**: 3 Chart.js graphs:
     - Precipitación Mensual (mm) [Monthly bars + historical dotted line].
     - Temperatura del Aire (°C) [Mean, Historical mean, Max, Min].
     - Humedad Relativa del Aire (%) [Max, Mean, Historical mean, Min with area fill].
  2. **Tabla de datos**: 12 monthly rows + annual summary row with precipitation, temperature, streamflow, and humidity metrics.
- Actions: "Descargar Excel" (generates compliant CSV matrix) and modal close button.
