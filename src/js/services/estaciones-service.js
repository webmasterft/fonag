/**
 * Service: Estaciones Hidroclimáticas
 * Todas las estaciones vienen del endpoint autenticado /api/sedc/estacion/list (sesión SEDC).
 * Sin datos locales de respaldo: si la API falla se lanza un error para que la página lo muestre.
 */

/**
 * Obtiene la lista completa de estaciones.
 * @returns {Promise<Array<Object>>}
 * @throws {Error} Si la API no responde o la sesión no trae datos completos (sin eje_trabajo)
 */
export async function fetchEstaciones() {
  const res = await fetch('/api/sedc/estacion/list/?administrador=1&limit=300');
  if (!res.ok) throw new Error(`Listado de estaciones no disponible (${res.status})`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data.results || []);
  // Without an authenticated session SEDC returns a reduced row without eje_trabajo / est_id
  if (list.length > 0 && list[0].eje_trabajo === undefined) {
    throw new Error('SEDC devolvió el listado sin sesión autenticada');
  }
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
        : '';

      // Sin valores inventados: un dato que la API no trae queda vacío (la UI muestra '-')
      return {
        id: item.est_id,
        codigo: item.est_codigo || '',
        nombre: item.est_nombre || '',
        tipo: item.tipo || '',
        provincia: item.provincia || '',
        cuenca: item.sistemacuenca?.cuenca || item.micro_cuenca || '',
        sistema: item.sistemacuenca?.sistema || '',
        eje_trabajo: ejeNombre,
        // null coordinates: the station is listed but not drawn on the map
        latitud: Number.isFinite(lat) ? lat : null,
        longitud: Number.isFinite(lng) ? lng : null,
        altura: item.est_altura ? `${parseFloat(item.est_altura).toFixed(0)} m` : 'N/D',
        administrador: item.administrador || '',
        transmision: Boolean(item.transmision),
        fechaInicio: item.est_fecha_inicio || 'N/D',
        // Fila original de /estacion/list/: algunos reportes SEDC (hydro_annual) la requieren completa
        raw: item,
      };
    });
}
