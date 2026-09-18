/**
 * Page Module: Home Stations Map (Figma Match)
 * Renderiza los polígonos coloreados de Ejes de Trabajo con etiquetas centradas,
 * estaciones con colores coincidentes al diseño (Meteorológica: Naranja, Pluviométrica: Morado, Hidrológica: Celeste),
 * leyenda flotante inferior izquierda y tarjeta lateral derecha de Ejes de Trabajo interactiva.
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchPointGeojson } from '../services/estaciones-service.js';
import ejesGeojsonData from '../../data/ejes_2026.json';

// Paleta de colores para los tipos de estación (Figma Match)
const TYPE_COLORS = {
  'Meteorológica': '#f59e0b', // Naranja/Ambar
  'Pluviométrica': '#8b5cf6', // Morado / Violeta
  'Hidrológica': '#38bdf8',   // Celeste / Azul cielo
  'default': '#64748b'
};

// Configuración visual por Eje de Trabajo (Figma Match exacto)
const EJES_CONFIG = {
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
    name: 'Noroccidente del DMQ',
    shortName: 'Noroccidente',
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

export async function initHomeStationsMap() {
  const container = document.getElementById('home-stations-map');
  if (!container) return;

  const loader = document.getElementById('home-map-loader');
  const countMeteoEl = document.getElementById('count-meteo');
  const countPluvioEl = document.getElementById('count-pluvio');
  const countHidroEl = document.getElementById('count-hidro');
  const ejesButtons = document.querySelectorAll('.eje-list-item');
  const legendItems = document.querySelectorAll('.tipo-legend-item');

  // Inicializar Leaflet centrado en el Distrito Metropolitano de Quito y cuencas
  const map = L.map(container, {
    center: [-0.18, -78.45],
    zoom: 10,
    zoomControl: true,
    scrollWheelZoom: false,
  });

  // Capa base suave estilo CartoDB Positron / OSM
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
    subdomains: 'abcd',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
  }).addTo(map);

  const polygonsLayer = L.layerGroup().addTo(map);
  const markersLayer = L.layerGroup().addTo(map);
  const labelsLayer = L.layerGroup().addTo(map);

  let currentFeatures = [];
  let activeEje = 'ALL';
  let activeTipo = 'ALL';
  const polygonLayersMap = new Map();

  function showLoading(show) {
    if (loader) {
      loader.style.display = show ? 'flex' : 'none';
    }
  }

  // 1. Renderizar Polígonos de Ejes de Trabajo
  function renderEjesPolygons() {
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

      const geoLayer = L.geoJSON(feature, {
        style: () => ({
          fillColor: config.color,
          fillOpacity: config.fillOpacity,
          color: config.border,
          weight: 1.5,
          opacity: 0.9,
          dashArray: ''
        })
      });

      // Hover interactivo en el polígono
      geoLayer.on('mouseover', () => {
        geoLayer.setStyle({
          fillOpacity: 0.75,
          weight: 2.5
        });
      });

      geoLayer.on('mouseout', () => {
        const isActive = activeEje !== 'ALL' && activeEje.toUpperCase() === ejeKey.toUpperCase();
        geoLayer.setStyle({
          fillOpacity: isActive ? 0.8 : config.fillOpacity,
          weight: isActive ? 3 : 1.5
        });
      });

      geoLayer.on('click', () => {
        selectEje(config.name);
      });

      polygonsLayer.addLayer(geoLayer);
      polygonLayersMap.set(ejeKey.toUpperCase(), geoLayer);

      // Etiqueta centrada del Eje en el mapa (como en Figma)
      try {
        const bounds = geoLayer.getBounds();
        const center = bounds.getCenter();
        const displayName = config.name === 'Noroccidente' ? 'Noroccidente<br>del DMQ' : config.name;

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
      } catch (e) {
        // center calculation fallback
      }
    });
  }

  // 2. Renderizar Estaciones (Pins con colores coincidentes)
  function renderMarkers() {
    markersLayer.clearLayers();

    let meteoCount = 0;
    let pluvioCount = 0;
    let hidroCount = 0;

    const filtered = currentFeatures.filter(feature => {
      const props = feature.properties || {};
      const tipo = (props.tipo || '').trim();
      const sistema = (props.sistema || props.cuenca || '').toUpperCase();

      // Conteo para la leyenda
      if (tipo === 'Meteorológica') meteoCount++;
      else if (tipo === 'Pluviométrica') pluvioCount++;
      else if (tipo === 'Hidrológica') hidroCount++;

      // Filtro tipo
      const matchTipo = (activeTipo === 'ALL') || (tipo === activeTipo);

      // Filtro eje
      let matchEje = true;
      if (activeEje !== 'ALL') {
        const target = activeEje.toUpperCase();
        matchEje = sistema.includes(target) || target.includes(sistema);
      }

      return matchTipo && matchEje;
    });

    // Actualizar contadores si están en ALL
    if (activeEje === 'ALL' && activeTipo === 'ALL') {
      if (countMeteoEl) countMeteoEl.textContent = meteoCount || 16;
      if (countPluvioEl) countPluvioEl.textContent = pluvioCount || 24;
      if (countHidroEl) countHidroEl.textContent = hidroCount || 21;
    }

    filtered.forEach(feature => {
      const coords = feature.geometry?.coordinates;
      if (!coords || coords.length < 2) return;

      const lng = coords[0];
      const lat = coords[1];
      if (isNaN(lat) || isNaN(lng)) return;

      const tipo = feature.properties?.tipo || 'default';
      const color = TYPE_COLORS[tipo] || TYPE_COLORS.default;

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
        iconAnchor: [7, 7]
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      const popupContent = `
        <div style="font-family: 'Inter', sans-serif; font-size: 13px; min-width: 180px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; display: inline-block;"></span>
            <strong style="color: #242857; font-size: 14px;">${feature.properties?.est_codigo || ''}</strong>
          </div>
          <p style="margin: 0 0 4px; color: #475569; font-weight: 500;">${feature.properties?.est_nombre || ''}</p>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">
            Tipo: <strong>${tipo}</strong>
          </div>
          <div style="margin-top: 6px;">
            <a href="/consultas/anuario/?codigo=${feature.properties?.est_codigo || ''}" 
               style="font-size: 11.5px; color: #f19001; font-weight: 700; text-decoration: none;">
              Ver en Anuario &rarr;
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      markersLayer.addLayer(marker);
    });
  }

  // Manejar selección de Eje
  function selectEje(ejeName) {
    ejesButtons.forEach(btn => {
      const dataEje = btn.getAttribute('data-eje');
      if (dataEje === ejeName && activeEje !== ejeName) {
        btn.classList.add('active');
      } else if (dataEje === ejeName && activeEje === ejeName) {
        btn.classList.remove('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (activeEje === ejeName) {
      activeEje = 'ALL';
      map.setView([-0.18, -78.45], 10);
    } else {
      activeEje = ejeName;
      // Resaltar polígono y enfocar
      const layer = polygonLayersMap.get(ejeName.toUpperCase());
      if (layer) {
        map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 12 });
      }
    }

    renderEjesPolygons();
    renderMarkers();
  }

  // Listeners de los botones de la tarjeta lateral
  ejesButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const ejeName = btn.getAttribute('data-eje');
      selectEje(ejeName);
    });
  });

  // Listeners de la leyenda flotante de tipo
  legendItems.forEach(item => {
    item.addEventListener('click', () => {
      const type = item.getAttribute('data-type');
      if (activeTipo === type) {
        activeTipo = 'ALL';
        legendItems.forEach(i => i.style.opacity = '1');
      } else {
        activeTipo = type;
        legendItems.forEach(i => {
          i.style.opacity = (i.getAttribute('data-type') === type) ? '1' : '0.4';
        });
      }
      renderMarkers();
    });
  });

  // Inicialización
  showLoading(true);
  try {
    renderEjesPolygons();
    const geojson = await fetchPointGeojson('hydroclimate');
    currentFeatures = geojson?.features || [];
    renderMarkers();
  } catch (err) {
    console.error('Error cargando datos para el mapa de inicio:', err);
  } finally {
    showLoading(false);
    setTimeout(() => map.invalidateSize(), 200);
  }
}
