# Specification: Consultas por Periodo Component

## 1. Overview
Time series query interface (`/consultas/periodo/`) allowing users to analyze hydroclimatic variables for individual stations across custom date ranges and time frequencies.

## 2. Visual & Structural Specifications

### 2.1 Filter Bar (Figma Exact Match)
- **Top Row**:
  - **Fecha inicio**: Input date field with calendar indicator.
  - **Fecha fin**: Input date field with calendar indicator.
  - **Variable***: Mandatory dropdown with orange asterisk:
    - Precipitación (mm)
    - Temperatura (°C)
    - Caudal (m³/s)
    - Humedad Relativa (%)
    - Nivel de Agua (m)
    - Presión Atmosférica (hPa)
    - Radiación Solar (W/m²)
    - Velocidad del Viento (m/s)
  - **Frecuencia**: Horario, Diario, Mensual.
  - **Limpiar**: Neutral button resetting filters.
- **Bottom Row**:
  - **Código**: Text query input (`Ej: ATP01`).
  - **Nombre de estación**: Text query input (`Buscar por nombre...`).
  - **Tipo de Estación**: Dropdown select (Todos, Hidrológica, Meteorológica, Pluviométrica).
  - **Dynamic Counter**: `[Count] estaciones con [variable seleccionada]`.

### 2.2 Secondary Guide Instruction
- Accent text in brand orange:
  > **Haz clic en un eje de trabajo para filtrar.**  
  > Los marcadores muestran estaciones con la variable seleccionada.

### 2.3 Split View Layout
- **Left Column**: Interactive Leaflet map with territorial work axis polygons and station markers filtered by variable and active filters.
- **Right Column**: Station cards with dual action buttons:
  - **Ver datos**: Orange pill button (`#f19001`) with chart icon opening the time series visualization modal.
  - **Descargar**: Dark navy button (`#1e2347`) with download icon triggering instant CSV export.

### 2.4 Time Series Modal
- Header: Station identity, selected variable, date range, frequency.
- Interactive Chart: Line/bar visualization of the selected period.
- Data table preview with pagination and export.
