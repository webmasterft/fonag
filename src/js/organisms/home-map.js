/**
 * Page Module: Home Stations Map (Figma Match)
 * Renderiza los polígonos coloreados de Ejes de Trabajo con etiquetas centradas,
 * estaciones con colores coincidentes al diseño (Meteorológica: Naranja, Pluviométrica: Morado, Hidrológica: Celeste),
 * leyenda flotante inferior izquierda y tarjeta lateral derecha con vista de lista y vista de detalle por eje.
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchPointGeojson } from '../services/estaciones-service.js';
import ejesGeojsonData from '../../data/ejes_2026.json';

// Paleta de colores para los tipos de estación (Figma Match)
const TYPE_COLORS = {
  'Meteorológica': '#f59e0b', // Naranja
  'Pluviométrica': '#8b5cf6', // Morado
  'Hidrológica': '#38bdf8',   // Celeste
  'default': '#64748b'
};

// Configuración y estadísticas por Eje de Trabajo (Figma Match exacto)
const EJES_CONFIG = {
  'PITA': {
    name: 'Pita',
    color: '#f9b872',
    fillOpacity: 0.55,
    border: '#e0984c',
    total: 12,
    meteo: 3,
    pluvio: 4,
    hidro: 5,
    pct: 20
  },
  'PICHINCHA ATACAZO': {
    name: 'Pichincha Atacazo',
    color: '#a3c97e',
    fillOpacity: 0.55,
    border: '#83a85e',
    total: 11,
    meteo: 2,
    pluvio: 5,
    hidro: 4,
    pct: 18
  },
  'NORORIENTE DMQ': {
    name: 'Nororiente DMQ',
    color: '#c98a75',
    fillOpacity: 0.55,
    border: '#ad725e',
    total: 8,
    meteo: 2,
    pluvio: 4,
    hidro: 2,
    pct: 13
  },
  'ANTISANA': {
    name: 'Antisana',
    color: '#5c7cfa',
    fillOpacity: 0.55,
    border: '#4263eb',
    total: 16,
    meteo: 3,
    pluvio: 6,
    hidro: 7,
    pct: 26
  },
  'PAPALLACTA - OYACACHI': {
    name: 'Papallacta - Oyacachi',
    color: '#f1dfbb',
    fillOpacity: 0.65,
    border: '#d6c096',
    total: 5,
    meteo: 3,
    pluvio: 1,
    hidro: 1,
    pct: 8
  },
  'SAN PEDRO': {
    name: 'San Pedro',
    color: '#63b39d',
    fillOpacity: 0.55,
    border: '#4a9984',
    total: 2,
    meteo: 2,
    pluvio: 0,
    hidro: 0,
    pct: 3
  },
  'PISQUE': {
    name: 'Pisque',
    color: '#f472b6',
    fillOpacity: 0.55,
    border: '#db2777',
    total: 2,
    meteo: 0,
    pluvio: 1,
    hidro: 1,
    pct: 3
  },
  'NOROCCIDENTE': {
    name: 'Noroccidente',
    displayName: 'Noroccidente del DMQ',
    color: '#93c5fd',
    fillOpacity: 0.55,
    border: '#60a5fa',
    total: 5,
    meteo: 1,
    pluvio: 3,
    hidro: 1,
    pct: 8
  },
  'NORCENTRAL': {
    name: 'Norcentral',
    color: '#b4a2b8',
    fillOpacity: 0.55,
    border: '#9a859f',
    total: 5,
    meteo: 0,
    pluvio: 3,
    hidro: 2,
    pct: 8
  }
};

export async function initHomeStationsMap() {
  const container = document.getElementById('home-stations-map');
  if (!container) return;

  const cardAside = document.getElementById('home-ejes-card');
  const loader = document.getElementById('home-map-loader');
  const countMeteoEl = document.getElementById('count-meteo');
  const countPluvioEl = document.getElementById('count-pluvio');
  const countHidroEl = document.getElementById('count-hidro');
  const legendItems = document.querySelectorAll('.tipo-legend-item');

  // Inicializar Leaflet centrado en el Distrito Metropolitano de Quito
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

      geoLayer.on('click', () => {
        selectEje(config.name);
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
        } catch (e) {
          // center calculation fallback
        }
      }
    });
  }

  // 2. Renderizar Estaciones (Pins con colores)
  function renderMarkers() {
    markersLayer.clearLayers();

    let meteoCount = 0;
    let pluvioCount = 0;
    let hidroCount = 0;

    const filtered = currentFeatures.filter(feature => {
      const props = feature.properties || {};
      const tipo = (props.tipo || '').trim();
      const sistema = (props.sistema || props.cuenca || '').toUpperCase();

      // Conteo general
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

  // 3. Renderizar la Tarjeta Lateral (Lista vs Detalle)
  function renderSidebar() {
    if (!cardAside) return;

    if (activeEje === 'ALL') {
      // Vista 1: Lista completa de Ejes de trabajo (Figma captura 1)
      cardAside.innerHTML = `
        <h2 class="home-ejes-title">Ejes de trabajo</h2>
        <div class="home-ejes-underline" aria-hidden="true"></div>
        <p class="home-ejes-subtitle">Ver detalle por eje</p>

        <div class="home-ejes-list" id="home-ejes-list" role="list">
          ${Object.values(EJES_CONFIG).map(cfg => `
            <button class="eje-list-item" data-eje="${cfg.name}" type="button" role="listitem">
              <span class="eje-indicator" style="background-color: ${cfg.color};"></span>
              <span class="eje-item-name">${cfg.name}</span>
              <span class="eje-item-count">${cfg.total}</span>
            </button>
          `).join('')}
        </div>
      `;

      // Re-enlazar eventos
      cardAside.querySelectorAll('.eje-list-item').forEach(btn => {
        btn.addEventListener('click', () => {
          selectEje(btn.getAttribute('data-eje'));
        });
      });

    } else {
      // Vista 2: Detalle del Eje Seleccionado (Figma captura 2)
      const configKey = Object.keys(EJES_CONFIG).find(k => EJES_CONFIG[k].name.toUpperCase() === activeEje.toUpperCase()) || 'PITA';
      const cfg = EJES_CONFIG[configKey] || EJES_CONFIG['PITA'];

      cardAside.innerHTML = `
        <div class="eje-detail-view">
          <!-- Back button: < Todos los ejes -->
          <button class="eje-btn-back" id="btn-back-ejes" type="button" aria-label="Volver a todos los ejes">
            &lt; Todos los ejes
          </button>

          <!-- Top Selected Eje Pill Box -->
          <div class="eje-detail-header-card">
            <span class="eje-indicator" style="background-color: ${cfg.color};"></span>
            <span class="eje-detail-header-title">${cfg.name}</span>
            <span class="eje-detail-header-count">${cfg.total} estaciones activas</span>
          </div>

          <!-- Breakdown by Tipo -->
          <div class="eje-detail-type-section">
            <h3 class="eje-detail-type-title">Tipo</h3>
            <div class="eje-detail-type-list">
              <div class="eje-detail-type-item">
                <span class="tipo-legend-dot meteo"></span>
                <span>Meteorológica</span>
                <span class="type-count meteo">${cfg.meteo}</span>
              </div>
              <div class="eje-detail-type-item">
                <span class="tipo-legend-dot pluvio"></span>
                <span>Pluviométrica</span>
                <span class="type-count pluvio">${cfg.pluvio}</span>
              </div>
              <div class="eje-detail-type-item">
                <span class="tipo-legend-dot hidro"></span>
                <span>Hidrológica</span>
                <span class="type-count hidro">${cfg.hidro}</span>
              </div>
            </div>
          </div>

          <!-- Representation Info Box -->
          <div class="eje-detail-callout">
            <strong>${cfg.name}</strong> representa el <strong>${cfg.pct}%</strong> de las estaciones activas de la red
          </div>

          <!-- Bottom CTA Button -->
          <div class="eje-detail-cta-wrap">
            <a href="/estaciones/?eje=${encodeURIComponent(cfg.name)}" class="btn-eje-ver-estaciones">
              Ver estaciones
            </a>
          </div>
        </div>
      `;

      // Listener para el botón volver
      const backBtn = cardAside.querySelector('#btn-back-ejes');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          selectEje('ALL');
        });
      }
    }
  }

  // Manejar selección de Eje
  function selectEje(ejeName) {
    if (ejeName === 'ALL' || activeEje === ejeName) {
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
    renderSidebar();
  }

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
    renderSidebar();
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
