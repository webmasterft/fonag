/**
 * Molecule: Interactive Leaflet Map for Anuario Hidroclimático
 * Integra los polígonos territoriales de los 9 Ejes de Trabajo (ejes_2026.json),
 * colores idénticos a los del Home (Meteorológica: #f59e0b, Pluviométrica: #8b5cf6, Hidrológica: #38bdf8),
 * filtrado interactivo por eje al hacer clic en un polígono y tarjeta flotante "TIPO DE ESTACIÓN".
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ejesGeojsonData from '../../../data/ejes_2026.json';
import { escapeHtml, displayValue } from '../../atoms/escape-html.js';

// Paleta corporativa unificada de colores por tipo (single source, also used by the Home map)
export const TYPE_COLORS = {
  'Meteorológica': '#f59e0b', // Naranja
  'Pluviométrica': '#8b5cf6', // Morado
  'Hidrológica': '#38bdf8',   // Celeste
  'default': '#64748b'
};

// Configuración visual de los 9 Ejes de Trabajo (single source, also used by the Home map)
export const EJES_CONFIG = {
  'PITA': {
    name: 'Pita',
    color: '#f9b872',
    fillOpacity: 0.55,
    border: '#e0984c'
  },
  'PICHINCHA ATACAZO': {
    name: 'Pichincha Atacazo',
    color: '#a3c97e',
    fillOpacity: 0.55,
    border: '#83a85e'
  },
  'NORORIENTE DMQ': {
    name: 'Nororiente DMQ',
    color: '#c98a75',
    fillOpacity: 0.55,
    border: '#ad725e'
  },
  'ANTISANA': {
    name: 'Antisana',
    color: '#5c7cfa',
    fillOpacity: 0.55,
    border: '#4263eb'
  },
  'PAPALLACTA - OYACACHI': {
    name: 'Papallacta - Oyacachi',
    color: '#f1dfbb',
    fillOpacity: 0.65,
    border: '#d6c096'
  },
  'SAN PEDRO': {
    name: 'San Pedro',
    color: '#63b39d',
    fillOpacity: 0.55,
    border: '#4a9984'
  },
  'PISQUE': {
    name: 'Pisque',
    color: '#f472b6',
    fillOpacity: 0.55,
    border: '#db2777'
  },
  'NOROCCIDENTE': {
    name: 'Noroccidente',
    displayName: 'Noroccidente del DMQ',
    color: '#93c5fd',
    fillOpacity: 0.55,
    border: '#60a5fa'
  },
  'NORCENTRAL': {
    name: 'Norcentral',
    color: '#b4a2b8',
    fillOpacity: 0.55,
    border: '#9a859f'
  }
};

export function formatEjeName(name) {
  if (!name) return '';
  const u = name.toUpperCase();
  if (u.includes('PITA')) return 'Pita';
  if (u.includes('PICHINCHA')) return 'Pichincha Atacazo';
  if (u.includes('NORORIENTE')) return 'Nororiente DMQ';
  if (u.includes('ANTISANA')) return 'Antisana';
  if (u.includes('PAPALLACTA')) return 'Papallacta - Oyacachi';
  if (u.includes('SAN PEDRO')) return 'San Pedro';
  if (u.includes('PISQUE')) return 'Pisque';
  if (u.includes('NOROCCIDENTE')) return 'Noroccidente';
  if (u.includes('NORCENTRAL')) return 'Norcentral';
  return name;
}

const UNKNOWN_EJE_CONFIG = { name: '', color: '#cbd5e1', border: '#94a3b8' };

export function getEjeConfig(name) {
  // No eje_trabajo from the API: neutral color, never another eje's config
  if (!name) return UNKNOWN_EJE_CONFIG;
  const formatted = formatEjeName(name).toUpperCase();
  const matchKey = Object.keys(EJES_CONFIG).find(k => EJES_CONFIG[k].name.toUpperCase() === formatted || k === formatted);
  return matchKey ? EJES_CONFIG[matchKey] : { name, color: '#64748b', border: '#475569' };
}

/**
 * Inicializa el mapa interactivo del Anuario Hidroclimático
 * @param {string|HTMLElement} containerId
 * @param {Object} options
 * @returns {Object} Instancia del controlador del mapa
 */
export function initLeafletMap(containerId = 'station-map', options = {}) {
  const container = typeof containerId === 'string'
    ? document.getElementById(containerId)
    : containerId;

  if (!container) return null;

  const onEjeSelect = options.onEjeSelect || null;
  let activeEje = 'ALL';

  // Mapa con zoom panorámico idéntico al del home
  const map = L.map(container, {
    center: [-0.32, -78.38],
    zoom: 8.8,
    zoomSnap: 0.1,
    zoomDelta: 0.5,
    zoomControl: true,
    scrollWheelZoom: false,
  });

  // Capa base suave estilo CartoDB Voyager
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
    subdomains: 'abcd',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | FONAG SEDC'
  }).addTo(map);

  const polygonsLayer = L.layerGroup().addTo(map);
  const labelsLayer = L.layerGroup().addTo(map);
  const markerLayer = L.layerGroup().addTo(map);
  const polygonLayersMap = new Map();
  const markerMap = new Map();

  /**
   * Renderiza los polígonos de los Ejes de Trabajo
   */
  function renderPolygons() {
    polygonsLayer.clearLayers();
    labelsLayer.clearLayers();
    polygonLayersMap.clear();

    if (!ejesGeojsonData || !Array.isArray(ejesGeojsonData.features)) return;

    ejesGeojsonData.features.forEach(feature => {
      const ejeKey = feature.properties?.eje_trab || '';
      const config = EJES_CONFIG[ejeKey] || {
        name: ejeKey,
        color: '#94a3b8',
        fillOpacity: 0.45,
        border: '#64748b'
      };

      const isThisEjeActive = activeEje !== 'ALL' && activeEje.toUpperCase() === config.name.toUpperCase();

      const geoLayer = L.geoJSON(feature, {
        style: () => ({
          fillColor: config.color,
          fillOpacity: (activeEje === 'ALL') ? config.fillOpacity : (isThisEjeActive ? 0.75 : 0.15),
          color: (activeEje === 'ALL') ? config.border : (isThisEjeActive ? config.border : '#cbd5e1'),
          weight: isThisEjeActive ? 3 : 1.5,
          opacity: (activeEje === 'ALL' || isThisEjeActive) ? 0.9 : 0.3
        })
      });

      // Hover interactivo en el polígono
      geoLayer.on('mouseover', () => {
        if (activeEje === 'ALL' || isThisEjeActive) {
          geoLayer.setStyle({
            fillOpacity: 0.8,
            weight: 2.5
          });
        }
      });

      geoLayer.on('mouseout', () => {
        geoLayer.setStyle({
          fillOpacity: (activeEje === 'ALL') ? config.fillOpacity : (isThisEjeActive ? 0.75 : 0.15),
          weight: isThisEjeActive ? 3 : 1.5
        });
      });

      // Al hacer clic en un eje, filtrar estaciones
      geoLayer.on('click', () => {
        toggleEjeSelection(config.name);
      });

      polygonsLayer.addLayer(geoLayer);
      polygonLayersMap.set(config.name.toUpperCase(), geoLayer);

      // Etiqueta centrada del Eje en el mapa
      if (activeEje === 'ALL' || isThisEjeActive) {
        try {
          const bounds = geoLayer.getBounds();
          const center = bounds.getCenter();
          const displayName = config.displayName || config.name;

          const labelMarker = L.marker(center, {
            icon: L.divIcon({
              className: 'eje-polygon-label',
              html: `<div style="text-align: center; line-height: 1.2; font-size: 11px; font-weight: 700; color: #1e293b;">${displayName}</div>`,
              iconSize: [120, 30],
              iconAnchor: [60, 15]
            }),
            interactive: false
          });
          labelsLayer.addLayer(labelMarker);
        } catch {
          // ignore center calculation exception
        }
      }
    });
  }

  function toggleEjeSelection(ejeName) {
    if (activeEje === ejeName) {
      activeEje = 'ALL';
      map.setView([-0.32, -78.38], 8.8);
    } else {
      activeEje = ejeName;
      const layer = polygonLayersMap.get(ejeName.toUpperCase());
      if (layer) {
        map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 12 });
      }
    }

    renderPolygons();

    if (typeof onEjeSelect === 'function') {
      onEjeSelect(activeEje);
    }
  }

  /**
   * Actualiza los marcadores en el mapa basados en la lista filtrada de estaciones.
   */
  function setMarkers(estaciones, onSelectStation, year = '') {
    markerLayer.clearLayers();
    markerMap.clear();

    estaciones.forEach((estacion) => {
      if (typeof estacion.latitud !== 'number' || typeof estacion.longitud !== 'number') return;

      const color = TYPE_COLORS[estacion.tipo] || TYPE_COLORS.default;

      // Marcador circular unificado (idéntico al Home)
      const customIcon = L.divIcon({
        className: 'station-marker-icon',
        html: `
          <div class="station-pin" style="
            background-color: ${color};
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 5px rgba(0,0,0,0.35);
          "></div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([estacion.latitud, estacion.longitud], { icon: customIcon });

      const btnLabelText = escapeHtml(typeof year === 'object' ? (year.buttonText || 'Ver datos') : `Ver estadísticas ${year}`.trim());

      const formatCoord = (val) => {
        if (val == null || val === '' || isNaN(Number(val))) return '-';
        return Number(val).toFixed(4);
      };

      const popupContent = `
        <div class="map-station-popup" style="font-family: 'Inter', sans-serif; font-size: 13px; min-width: 190px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; display: inline-block;"></span>
              <strong style="color: #242857; font-size: 14px;">${displayValue(estacion.codigo)}</strong>
            </div>
          </div>
          <p style="margin: 0 0 6px; color: #475569; font-weight: 500;">${displayValue(estacion.nombre)}</p>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 4px;">
            <span>Tipo: <strong>${displayValue(estacion.tipo)}</strong></span>
            <span>Alt: <strong>${displayValue(estacion.altura)}</strong></span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 8px;">
            <span>Latitud: <strong style="color: #242857;">${formatCoord(estacion.latitud)}</strong></span>
            <span>Longitud: <strong style="color: #242857;">${formatCoord(estacion.longitud)}</strong></span>
          </div>
          <button
            class="btn-popup-ver-datos"
            data-codigo="${escapeHtml(estacion.codigo)}"
            style="
              width: 100%;
              padding: 6px 10px;
              background-color: #F19001;
              color: #ffffff;
              border: none;
              border-radius: 6px;
              font-weight: 700;
              font-size: 12px;
              cursor: pointer;
            "
          >
            ${btnLabelText}
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        if (typeof onSelectStation === 'function') {
          onSelectStation(estacion);
        }
      });

      marker.on('popupopen', (e) => {
        const popupEl = e.popup.getElement()?.querySelector('.btn-popup-ver-datos');
        if (popupEl) {
          popupEl.addEventListener('click', () => {
            if (typeof onSelectStation === 'function') {
              onSelectStation(estacion, true);
            }
          });
        }
      });

      markerLayer.addLayer(marker);
      markerMap.set(estacion.codigo, marker);
    });
  }

  function focusStation(estacion) {
    const marker = markerMap.get(estacion.codigo);
    if (marker) {
      map.setView([estacion.latitud, estacion.longitud], 12, { animate: true });
      marker.openPopup();
    }
  }

  function setEje(ejeName) {
    activeEje = ejeName || 'ALL';
    if (activeEje === 'ALL') {
      map.setView([-0.32, -78.38], 8.8);
    } else {
      const layer = polygonLayersMap.get(activeEje.toUpperCase());
      if (layer) {
        map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 12 });
      }
    }
    renderPolygons();
  }

  // Inicializar polígonos
  renderPolygons();

  return {
    map,
    setMarkers,
    focusStation,
    setEje,
    getActiveEje: () => activeEje,
    invalidateSize: () => map.invalidateSize(),
  };
}
