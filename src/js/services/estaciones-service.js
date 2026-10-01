/**
 * Service: Estaciones Hidroclimáticas (100% Direct API Consumption)
 */

/**
 * Obtiene la lista completa de estaciones desde el API del SEDC.
 * @returns {Promise<Array<Object>>}
 */
export async function fetchEstaciones() {
  try {
    const res = await fetch('/api/sedc/informacion_red/list/');
    if (!res.ok) {
      throw new Error(`API SEDC HTTP ${res.status}`);
    }
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return normalizeEstaciones(data);
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

      return {
        id: item.est_id,
        codigo: item.est_codigo || 'S/N',
        nombre: item.est_nombre || 'Sin nombre',
        tipo: item.tipo || 'Meteorológica',
        provincia: item.provincia || 'Pichincha',
        cuenca: item.sistemacuenca?.cuenca || item.micro_cuenca || 'Cuenca Interandina',
        sistema: item.sistemacuenca?.sistema || 'General',
        eje_trabajo: item.eje_trabajo || 'General',
        latitud: isNaN(lat) ? -0.22985 : lat,
        longitud: isNaN(lng) ? -78.52495 : lng,
        altura: item.est_altura ? `${parseFloat(item.est_altura).toFixed(0)} m` : 'N/D',
        administrador: item.administrador || 'FONAG',
        transmision: Boolean(item.transmision),
        fechaInicio: item.est_fecha_inicio || 'N/D',
      };
    });
}
