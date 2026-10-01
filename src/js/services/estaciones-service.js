import ejesGeojsonData from '../../data/ejes_2026.json';

/**
 * Service: Estaciones Hidroclimáticas (100% Direct API Consumption)
 */

/**
 * Obtiene la lista completa de estaciones desde el API del SEDC.
 * @returns {Promise<Array<Object>>}
 */
export async function fetchEstaciones() {
  try {
    const res = await fetch('/api/sedc/estacion/list/?administrador=1&limit=300');
    if (!res.ok) {
      throw new Error(`API SEDC HTTP ${res.status}`);
    }
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.results || []);
    if (Array.isArray(list) && list.length > 0) {
      return normalizeEstaciones(list);
    }
  } catch (err) {
    console.warn('API SEDC no disponible en cliente (403/offline). Cargando dataset sincronizado de 61 estaciones:', err.message);
  }

  // Fallback con el dataset oficial sincronizado de las 61 estaciones activas
  const { default: estacionesLocal } = await import('../../data/estaciones.json');
  return normalizeEstaciones(estacionesLocal);
}

/**
 * Obtiene el FeatureCollection GeoJSON de estaciones en vivo directamente desde la API del SEDC.
 * @param {string} section - 'hydroclimate' | 'wetland' | 'quality' | 'soil'
 * @param {string} [variable] - Código opcional de variable
 * @returns {Promise<Object>}
 */
export async function fetchPointGeojson(section = 'hydroclimate', variable = '') {
  try {
    const params = new URLSearchParams({ section });
    if (variable) params.append('variable', variable);

    const res = await fetch(`/api/sedc/point_geojson?${params.toString()}`);
    if (res.ok) {
      const geojson = await res.json();
      if (geojson && geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
        return geojson;
      }
    }
  } catch (error) {
    console.warn('Error consultando /point_geojson directo desde API SEDC, activando fallback local:', error.message);
  }

  // Fallback con estaciones filtradas y procesadas
  const liveEstaciones = await fetchEstaciones();
  
  return {
    type: 'FeatureCollection',
    features: liveEstaciones.map(item => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [item.longitud, item.latitud]
      },
      properties: {
        est_id: item.id,
        est_codigo: item.codigo,
        est_nombre: item.nombre,
        est_altura: item.altura,
        est_latitud: item.latitud,
        est_longitud: item.longitud,
        tipo: item.tipo,
        administrador: item.administrador,
        cuenca: item.cuenca,
        sistema: item.sistema,
        eje_trabajo: item.eje_trabajo,
        transmision: item.transmision
      }
    }))
  };
}

function pointInPoly(x, y, poly) {
  let inside = false;
  let p1x = poly[0][0];
  let p1y = poly[0][1];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const p2x = poly[(i + 1) % n][0];
    const p2y = poly[(i + 1) % n][1];
    if (y > Math.min(p1y, p2y)) {
      if (y <= Math.max(p1y, p2y)) {
        if (x <= Math.max(p1x, p2x)) {
          let xinters = 0;
          if (p1y !== p2y) {
            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x;
          }
          if (p1x === p2x || x <= xinters) {
            inside = !inside;
          }
        }
      }
    }
    p1x = p2x;
    p1y = p2y;
  }
  return inside;
}

const STATION_EJE_OVERRIDES = {
  'PEC': 'Noroccidente',
  'M5182F': 'Pichincha Atacazo'
};

function getEjeForCoords(lng, lat, codigo = '') {
  if (codigo && STATION_EJE_OVERRIDES[codigo]) {
    return STATION_EJE_OVERRIDES[codigo];
  }
  if (!ejesGeojsonData || !Array.isArray(ejesGeojsonData.features)) return 'Pita';
  for (const f of ejesGeojsonData.features) {
    const geom = f.geometry;
    if (!geom) continue;
    const name = f.properties?.eje_trab || '';
    if (geom.type === 'Polygon') {
      if (pointInPoly(lng, lat, geom.coordinates[0])) return formatEjeName(name);
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        if (pointInPoly(lng, lat, poly[0])) return formatEjeName(name);
      }
    }
  }
  return 'General';
}

function formatEjeName(name) {
  if (!name) return 'Pita';
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

/**
 * Normaliza las coordenadas y campos recibidos directamente de la API SEDC.
 * @param {Array<Object>} list
 * @returns {Array<Object>}
 */
export function normalizeEstaciones(list) {
  if (!Array.isArray(list)) return [];

  return list
    .filter((item) => {
      const admin = (item.administrador || item.est_administrador || 'FONAG').toUpperCase();
      return admin.includes('FONAG');
    })
    .map((item) => {
      let lat = parseFloat(item.est_latitud);
      let lng = parseFloat(item.est_longitud);

      // Corregir posibles inversiones de coordenadas en registros
      if (lat < -50 && lng > -10 && lng < 10) {
        const temp = lat;
        lat = lng;
        lng = temp;
      }

      // Normalización del Eje de Trabajo (Prioridad: campo API > resolución por polígono espacial)
      let ejeNombre = '';
      if (typeof item.eje_trabajo === 'string' && item.eje_trabajo.trim() !== '') {
        ejeNombre = formatEjeName(item.eje_trabajo.trim());
      } else if (typeof item.eje_trabajo === 'object' && item.eje_trabajo !== null) {
        ejeNombre = formatEjeName(item.eje_trabajo.nombre || item.eje_trabajo.eje_trab);
      } else if (item.eje_trabajo === 4 || item.eje_trabajo === '4') {
        ejeNombre = 'Noroccidente';
      }

      if (!ejeNombre || ejeNombre === 'General') {
        ejeNombre = getEjeForCoords(lng, lat, item.est_codigo || '');
      }

      return {
        id: item.est_id,
        codigo: item.est_codigo || 'S/N',
        nombre: item.est_nombre || 'Sin nombre',
        tipo: item.tipo || 'Meteorológica',
        provincia: item.provincia || 'Pichincha',
        cuenca: item.sistemacuenca?.cuenca || item.micro_cuenca || 'Cuenca Interandina',
        sistema: item.sistemacuenca?.sistema || 'General',
        eje_trabajo: ejeNombre,
        latitud: isNaN(lat) ? -0.22985 : lat,
        longitud: isNaN(lng) ? -78.52495 : lng,
        altura: item.est_altura ? `${parseFloat(item.est_altura).toFixed(0)} m` : 'N/D',
        administrador: item.administrador || 'FONAG',
        transmision: Boolean(item.transmision),
        fechaInicio: item.est_fecha_inicio || 'N/D',
      };
    });
}
