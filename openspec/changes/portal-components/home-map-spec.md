# Specification: Home Map Section (Ejes de Trabajo & Leaflet Integration)

## 1. Overview
Organism component on the landing page displaying an interactive Leaflet map of FONAG's hydroclimatic monitoring network, paired with a territorial sidebar ("Ejes de trabajo") and a floating legend ("TIPO DE ESTACIÓN").

## 2. Visual & Structural Specifications

### 2.1 Layout & Grid
- **Container**: Max width `1366px`, 2-column CSS Grid (`1fr 340px`). Collapses to single column on viewports `<= 1024px`.
- **Left Column (Map)**: Leaflet container (`min-height: 560px`, rounded `18px`, subtle shadow `0 4px 20px rgba(0,0,0,0.06)`).
- **Right Column (Sidebar)**: White card (`#ffffff`, rounded `18px`, padding `1.75rem 1.5rem`).

### 2.2 Map Components & Interaction
- **Basemap**: CartoDB Positron/Voyager raster tiles.
- **Initial View**: Lat `-0.32`, Lng `-78.38`, Zoom `8.8` (encompasses all territorial axes).
- **Territorial Polygons**: 9 work axes loaded from `ejes_2026.json` with dedicated colors:
  - Pita (`#f9b872`), Pichincha Atacazo (`#a3c97e`), Nororiente DMQ (`#c98a75`), Antisana (`#5c7cfa`), Papallacta - Oyacachi (`#f1dfbb`), San Pedro (`#63b39d`), Pisque (`#f472b6`), Noroccidente (`#93c5fd`), Norcentral (`#b4a2b8`).
- **Station Pins**: Colored circle pins with white border (`14px` x `14px`):
  - Meteorológica: `#f59e0b` (Orange)
  - Pluviométrica: `#8b5cf6` (Purple)
  - Hidrológica: `#38bdf8` (Light blue)

### 2.3 Floating Legend ("TIPO DE ESTACIÓN")
- **Position**: Bottom-left corner inside map (`bottom: 18px; left: 18px; z-index: 1000`).
- **Surface**: White, blurred backdrop (`backdrop-filter: blur(4px)`), border-radius `12px`.
- **Interactivity**: Clicking any station type toggles filtering on the map markers and dims unselected types.

### 2.4 Sidebar State Machine
1. **List State (`activeEje === 'ALL'`)**:
   - Header: "Ejes de trabajo", orange underline, subtitle "Ver detalle por eje".
   - Vertical list of 9 buttons with circular color indicators and station count badges.
2. **Detail State (`activeEje !== 'ALL'`)**:
   - Back button: `< Todos los ejes`.
   - Header pill: Axis color, name, and total active stations.
   - Type breakdown: Counts for Meteorológica, Pluviométrica, and Hidrológica.
   - Representation callout: Percentage of network represented by the axis.
   - CTA button: "Ver estaciones" linking to `/estaciones/?eje=[Name]`.
