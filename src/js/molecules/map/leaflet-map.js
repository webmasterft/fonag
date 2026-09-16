/**
 * Molecule: Interactive Leaflet Map
 * Gestiona el mapa interactivo de estaciones con Leaflet, marcadores SVG y sincronización bidireccional.
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TYPE_COLORS = {
  Hidrológica: '#0284c7',
  Meteorológica: '#10b981',
  Pluviométrica: '#f59e0b',
  default: '#6366f1',
};

/**
 * Inicializa el mapa Leaflet en el elemento especificado.
 * @param {string|HTMLElement} containerId
 * @param {Object} options
 * @returns {Object} Instancia del controlador del mapa
 */
export function initLeafletMap(containerId = 'station-map') {
  const container = typeof containerId === 'string'
    ? document.getElementById(containerId)
    : containerId;

  if (!container) return null;

  // Centro en las cuencas de Quito y Distrito Metropolitano
  const map = L.map(container, {
    center: [-0.22985, -78.50495],
    zoom: 9,
    zoomControl: true,
    scrollWheelZoom: true,
  });

  // Capa base limpia y de alto rendimiento (OpenStreetMap Standard)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | FONAG SEDC',
  }).addTo(map);

  const markerLayer = L.layerGroup().addTo(map);
  const markerMap = new Map();

  /**
   * Actualiza los marcadores en el mapa basados en la lista filtrada de estaciones.
   * @param {Array<Object>} estaciones
   * @param {Function} onSelectStation
   */
  function setMarkers(estaciones, onSelectStation) {
    markerLayer.clearLayers();
    markerMap.clear();

    const bounds = [];

    estaciones.forEach((estacion) => {
      if (typeof estacion.latitud !== 'number' || typeof estacion.longitud !== 'number') return;

      const color = TYPE_COLORS[estacion.tipo] || TYPE_COLORS.default;

      // Marcador circular estilizado con SVG
      const customIcon = L.divIcon({
        className: 'station-marker-icon',
        html: `
          <div style="
            background-color: ${color};
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2.5px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          "></div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([estacion.latitud, estacion.longitud], { icon: customIcon });

      const popupContent = `
        <div class="map-station-popup" style="font-family: 'Inter', sans-serif; font-size: 13px; min-width: 180px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; display: inline-block;"></span>
            <strong style="color: #242857; font-size: 14px;">${estacion.codigo}</strong>
          </div>
          <p style="margin: 0 0 6px; color: #475569; font-weight: 500;">${estacion.nombre}</p>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 8px;">
            <span>Tipo: <strong>${estacion.tipo}</strong></span>
            <span>Alt: <strong>${estacion.altura}</strong></span>
          </div>
          <button
            class="btn-popup-ver-datos"
            data-codigo="${estacion.codigo}"
            style="
              width: 100%;
              padding: 5px 10px;
              background-color: #F19001;
              color: #ffffff;
              border: none;
              border-radius: 6px;
              font-weight: 600;
              font-size: 12px;
              cursor: pointer;
            "
          >
            Ver estadísticas
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        if (typeof onSelectStation === 'function') {
          onSelectStation(estacion);
        }
      });

      marker.on('popupopen', () => {
        const popupEl = document.querySelector(`.btn-popup-ver-datos[data-codigo="${estacion.codigo}"]`);
        if (popupEl) {
          popupEl.addEventListener('click', () => {
            if (typeof onSelectStation === 'function') {
              onSelectStation(estacion, true); // true indica abrir vista de datos
            }
          });
        }
      });

      markerLayer.addLayer(marker);
      markerMap.set(estacion.codigo, marker);
      bounds.push([estacion.latitud, estacion.longitud]);
    });

    // Ajustar vista a los marcadores si hay estaciones válidas
    if (bounds.length > 0 && bounds.length < 50) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    }
  }

  /**
   * Enfoca una estación específica en el mapa y abre su popup.
   * @param {Object} estacion
   */
  function focusStation(estacion) {
    const marker = markerMap.get(estacion.codigo);
    if (marker) {
      map.setView([estacion.latitud, estacion.longitud], 12, { animate: true });
      marker.openPopup();
    }
  }

  return {
    map,
    setMarkers,
    focusStation,
    invalidateSize: () => map.invalidateSize(),
  };
}
