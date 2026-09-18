# Specification: Estaciones Directory Component

## 1. Overview
Full directory view (`/estaciones/`) for discovering, filtering, sorting, and exporting all hydroclimatic monitoring stations across the FONAG network.

## 2. Visual & Structural Specifications

### 2.1 Filter Bar
- **Search inputs**:
  - Código (`#filter-codigo`): Instant text query by station alphanumeric code.
  - Nombre (`#filter-nombre`): Instant text query by station name.
- **Dropdown selects**:
  - Tipo (`#filter-tipo`): All, Meteorológica, Pluviométrica, Hidrológica.
  - Provincia (`#filter-provincia`): All, Pichincha, Imbabura, Napo, Cotopaxi.
  - Eje de Trabajo (`#filter-eje`): 9 territorial work axes.
- **Pills**: Interactive station type summary pills with real-time counter updates.

### 2.2 Data Table (`.estaciones-table`)
- **Columns**: No., Código, Nombre, Tipo, Provincia, Eje de Trabajo, Altura, Acciones.
- **Sorting**: Interactive sorting by any column (asc / desc) with header indicator arrows.
- **Pagination**: Configurable page size (10, 25, 50), page indicator (`Mostrando X - Y de Z`), previous/next navigation buttons.
- **Export**: Button "Descargar CSV" triggering immediate client-side generation and download of filtered dataset.

### 2.3 URL Query Parameter Support
- `?eje=[Name]`: Pre-selects work axis and filters table on mount.
- `?tipo=[Type]`: Pre-selects station category on mount.
- `?codigo=[Code]`: Pre-fills code input filter.
