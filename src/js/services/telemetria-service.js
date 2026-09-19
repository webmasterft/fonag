/**
 * Service: Telemetría en Tiempo Real (SEDC Live API)
 * Conecta directamente al endpoint /api/sedc/telemetria/consulta
 * autenticado contra el backend oficial del FONAG SEDC.
 */
import { getSeriesDeTiempo } from './periodo-service.js';

/**
 * Consulta las lecturas telemétricas reales para una estación y fecha de inicio.
 * Si la API responde con éxito, formatea las series de cada variable recibida.
 * En caso de error o sin conexión, activa el fallback garantizado.
 * 
 * @param {Object} estacion Objeto estación (incluye id, codigo, nombre, tipo)
 * @param {string} fechaInicio 'YYYY-MM-DD'
 * @param {string} fechaFin 'YYYY-MM-DD'
 * @returns {Promise<Object>} { variables: Array, seriesByVar: Object, fromLiveApi: boolean }
 */
export async function fetchTelemetriaReal(estacion, fechaInicio = '2026-09-01', fechaFin = '2026-09-03') {
  try {
    const res = await fetch('/api/sedc/telemetria/consulta', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        estacion: String(estacion.id),
        inicio: fechaInicio,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const varKeys = Object.keys(data);

      if (varKeys.length > 0) {
        const variables = [];
        const seriesByVar = {};

        varKeys.forEach((key) => {
          const item = data[key];
          if (!item) return;

          const varNombre = item.var_nombre || 'Variable';
          const varUnidad = item.var_unidad || '';
          const valores = (item.datos && Array.isArray(item.datos.valor)) ? item.datos.valor : [];
          const fechas = (item.datos && Array.isArray(item.datos.fecha)) ? item.datos.fecha : [];

          // Construir array normalizado de puntos
          const points = [];
          for (let i = 0; i < valores.length; i++) {
            if (valores[i] !== null && valores[i] !== undefined) {
              points.push({
                fecha: fechas[i] || '',
                valor: parseFloat(valores[i]),
                validado: false // Datos crudos telemétricos en tiempo real
              });
            }
          }

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

        return {
          fromLiveApi: true,
          variables,
          seriesByVar,
        };
      }
    }
  } catch (err) {
    console.warn('[SEDC Live Telemetry] Error al conectar con el backend real, activando fallback local:', err);
  }

  // Fallback determinista garantizado
  return getFallbackTelemetry(estacion, fechaInicio, fechaFin);
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

function getFallbackTelemetry(estacion, fechaInicio, fechaFin) {
  const fallbackPoints = getSeriesDeTiempo(estacion, 'PRE', fechaInicio, fechaFin, 'horario');
  return {
    fromLiveApi: false,
    variables: [
      {
        id: '1',
        name: 'Precipitación',
        unit: 'mm',
        code: 'PRE',
        color: '#3b82f6',
        count: fallbackPoints.length,
      },
    ],
    seriesByVar: {
      '1': fallbackPoints,
    },
  };
}
