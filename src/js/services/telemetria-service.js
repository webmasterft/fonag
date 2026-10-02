/**
 * Service: Telemetría en Tiempo Real (SEDC Live API)
 * Conecta al endpoint /api/sedc/telemetria/consulta autenticado con SEDC FONAG.
 * Sin datos simulados: si la API falla se devuelve un error para mostrarlo en la página.
 */

/**
 * Consulta las lecturas telemétricas reales para una estación y fecha de inicio.
 * Si la API responde con éxito, formatea las series de cada sensor.
 * Si la API no responde o no hay datos, retorna estado vacío sin simular valores.
 * 
 * @param {Object} estacion Objeto estación (incluye id, codigo, nombre, tipo)
 * @param {string} fechaInicio 'YYYY-MM-DD'
 * @param {string} fechaFin 'YYYY-MM-DD'
 * @returns {Promise<Object>} { variables: Array, seriesByVar: Object, hasData: boolean, error?: string }
 */
export async function fetchTelemetriaReal(estacion, fechaInicio = '2026-09-01', fechaFin = '2026-09-03') {
  try {
    const cleanStartDate = (fechaInicio || '2026-09-01').substring(0, 10);
    const res = await fetch('/api/sedc/telemetria/consulta', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        estacion: String(estacion.id),
        inicio: cleanStartDate,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const varKeys = Object.keys(data);

      if (varKeys.length > 0) {
        const variables = [];
        const seriesByVar = {};
        let totalMeasurements = 0;

        varKeys.forEach((key) => {
          const item = data[key];
          if (!item) return;

          const varNombre = item.var_nombre || 'Variable';
          const varUnidad = item.var_unidad || '';
          // Wind (velocidad/direccion) has no "valor": its speed feeds the table and CSV
          const isWind = item.datos && Array.isArray(item.datos.velocidad);
          const valores = isWind
            ? item.datos.velocidad
            : (item.datos && Array.isArray(item.datos.valor)) ? item.datos.valor : [];
          const fechas = (item.datos && Array.isArray(item.datos.fecha)) ? item.datos.fecha : [];

          // Construir array normalizado de puntos
          const points = [];
          for (let i = 0; i < valores.length; i++) {
            if (valores[i] !== null && valores[i] !== undefined) {
              points.push({
                fecha: fechas[i] || '',
                valor: parseFloat(valores[i])
              });
            }
          }
          // Full SEDC item (umbral_superior/inferior, wind direction) to build the Django-style chart
          points.raw = item;

          totalMeasurements += points.length;

          variables.push({
            id: key,
            name: varNombre,
            unit: varUnidad,
            code: getCodeForVarName(varNombre),
            color: getColorForVarName(varNombre),
            count: points.length,
          });

          seriesByVar[key] = points;
        });

        if (variables.length > 0 && totalMeasurements > 0) {
          return {
            hasData: true,
            variables,
            seriesByVar,
          };
        }
      }

      // La API respondió pero no hay datos de sensores para el rango solicitado
      return {
        hasData: false,
        variables: [],
        seriesByVar: {},
        error: 'No hay mediciones telemétricas registradas para esta estación en las fechas seleccionadas.'
      };
    } else {
      return {
        hasData: false,
        variables: [],
        seriesByVar: {},
        error: `Error al consultar la API del SEDC (${res.status}).`
      };
    }
  } catch (err) {
    console.warn('[SEDC Live Telemetry] Error de conexión:', err);
  }

  // Sin datos simulados: si la API no responde se informa el error
  return {
    hasData: false,
    variables: [],
    seriesByVar: {},
    error: 'Error en el API, intenta más tarde.'
  };
}

function getCodeForVarName(name = '') {
  const n = name.toLowerCase();
  if (n.includes('precipit')) return 'PRE';
  if (n.includes('temperatura')) return 'TEM';
  if (n.includes('caudal')) return 'CAU';
  if (n.includes('nivel')) return 'NIV';
  if (n.includes('humedad')) return 'HUM';
  if (n.includes('presi')) return 'PRE_ATM';
  if (n.includes('radiac')) return 'RAD';
  if (n.includes('viento')) return 'VIE';
  return 'GEN';
}

function getColorForVarName(name = '') {
  const n = name.toLowerCase();
  if (n.includes('precipit')) return '#3b82f6';
  if (n.includes('temperatura')) return '#f59e0b';
  if (n.includes('caudal')) return '#0284c7';
  if (n.includes('nivel')) return '#6366f1';
  if (n.includes('humedad')) return '#10b981';
  if (n.includes('presi')) return '#8b5cf6';
  if (n.includes('radiac')) return '#ec4899';
  if (n.includes('viento')) return '#14b8a6';
  return '#F19001';
}
