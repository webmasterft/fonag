/**
 * Service: Estaciones Hydroclimáticas
 * Gestiona la carga de estaciones con estrategia híbrida (API Live con Fallback local garantizado).
 */
import estacionesFallback from '../../data/estaciones.json';

/**
 * Obtiene la lista completa de estaciones normalizada.
 * @returns {Promise<Array<Object>>}
 */
export async function fetchEstaciones() {
  try {
    const res = await fetch('/api/sedc/informacion_red/list/');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return normalizeEstaciones(data);
      }
    }
  } catch (error) {
    console.warn('Fallo al conectar con la API en vivo del SEDC, activando dataset local:', error);
  }

  return normalizeEstaciones(estacionesFallback);
}

/**
 * Normaliza las coordenadas y campos de las estaciones.
 * @param {Array<Object>} list
 * @returns {Array<Object>}
 */
export function normalizeEstaciones(list) {
  return list.map((item) => {
    let lat = parseFloat(item.est_latitud);
    let lng = parseFloat(item.est_longitud);

    // Corregir posibles inversiones de coordenadas en algunos registros del SEDC
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
      latitud: isNaN(lat) ? -0.22985 : lat,
      longitud: isNaN(lng) ? -78.52495 : lng,
      altura: item.est_altura ? `${parseFloat(item.est_altura).toFixed(0)} m` : 'N/D',
      administrador: item.administrador || 'FONAG',
      transmision: Boolean(item.transmision),
      fechaInicio: item.est_fecha_inicio || 'N/D',
    };
  });
}
