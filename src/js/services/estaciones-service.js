/**
 * Service: Estaciones Hidroclimáticas
 *
 * Estrategia de datos:
 * 1. Primero intenta el endpoint local autenticado (/api/sedc/estacion/list)
 *    que inyecta sesión SEDC y devuelve eje_trabajo completo.
 * 2. Si falla (sesión expirada, sin red), usa el JSON canónico generado
 *    desde el API con credenciales (src/data/estaciones.json).
 *
 * El JSON estático es la fuente de verdad — fue generado autenticado.
 * Se actualiza ejecutando: node scripts/update-estaciones.js
 */
import canonicalData from '../../data/estaciones.json';

/**
 * Obtiene la lista completa de estaciones.
 * @returns {Promise<Array<Object>>}
 */
export async function fetchEstaciones() {
  try {
    const res = await fetch('/api/sedc/estacion/list/?administrador=1&limit=300');
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.results || []);
      if (Array.isArray(list) && list.length > 0 && list[0].eje_trabajo !== undefined) {
        return normalizeEstaciones(list);
      }
    }
  } catch (_) {
    // Silent — fallback to canonical JSON below
  }

  // Fallback: canonical JSON generated from authenticated API
  const list = Array.isArray(canonicalData) ? canonicalData : (canonicalData.results || []);
  return normalizeEstaciones(list);
}

/**
 * Obtiene el FeatureCollection GeoJSON de estaciones desde la API del SEDC.
 * @param {string} section - 'hydroclimate' | 'wetland' | 'quality' | 'soil'
 * @param {string} [variable] - Código opcional de variable
 * @returns {Promise<Object>}
 */
export async function fetchPointGeojson(section = 'hydroclimate', variable = '') {
  const params = new URLSearchParams({ section });
  if (variable) params.append('variable', variable);

  const res = await fetch(`/api/sedc/point_geojson?${params.toString()}`);
  if (res.ok) {
    const geojson = await res.json();
    if (geojson && geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
      return geojson;
    }
  }
  throw new Error('Error en el API, intenta más tarde.');
}

/**
 * Normaliza los campos recibidos de la API SEDC autenticada.
 * eje_trabajo viene como string ya resuelto por el backend Django.
 * @param {Array<Object>} list
 * @returns {Array<Object>}
 */
export function normalizeEstaciones(list) {
  if (!Array.isArray(list)) return [];

  return list
    .filter((item) => {
      const admin = (item.administrador || '').toUpperCase();
      // est_estado: false = inactive station; excluded on purpose (Django admin lists them)
      const active = item.est_estado !== false;
      return admin.includes('FONAG') && active;
    })
    .map((item) => {
      let lat = parseFloat(item.est_latitud);
      let lng = parseFloat(item.est_longitud);

      // Corregir inversión de coordenadas en registros mal cargados
      if (lat < -50 && lng > -10 && lng < 10) {
        const temp = lat;
        lat = lng;
        lng = temp;
      }

      // eje_trabajo viene directo del API — no se calcula, no se sobreescribe
      const ejeNombre = (typeof item.eje_trabajo === 'string' && item.eje_trabajo.trim())
        ? item.eje_trabajo.trim()
        : 'General';

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
