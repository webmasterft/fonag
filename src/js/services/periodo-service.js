/**
 * Service: Consultas por Periodo
 * Gestiona la definición de variables hidroclimáticas, filtrado de estaciones por variable,
 * generación determinista de series de tiempo (horario, diario, mensual) y exportación a CSV.
 */

/**
 * Catálogo de variables cargado desde la API SEDC (GET /variable/hidro/list).
 * Se llena con loadVariables(); las claves son var_codigo (PRE, TAI, VVI...).
 */
export const VARIABLES_CONFIG = {};

// SEDC `tipo` values: 3 = wind speed (rendered as wind rose), 4 = wind direction.
// Django shows both as a single "Viento" option backed by the speed variable.
const TIPO_VELOCIDAD_VIENTO = 3;
const TIPO_DIRECCION_VIENTO = 4;

const CHART_COLORS = { bar: '#3b82f6', line: '#F19001' };

/**
 * Carga el catálogo de variables activas desde la API y llena VARIABLES_CONFIG.
 * @returns {Promise<Array<Object>>} Variables en el orden de la API (var_id)
 */
export async function loadVariables() {
  const res = await fetch('/api/sedc/variable/hidro/list');
  if (!res.ok) throw new Error(`Catálogo de variables no disponible (${res.status})`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data.results || []);

  const variables = list
    .filter((v) => v.var_estado && v.tipo !== TIPO_DIRECCION_VIENTO)
    .sort((a, b) => a.var_id - b.var_id)
    .map((v) => {
      // var_nombre viene como "Precipitación(mm)"
      const match = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(v.var_nombre || '');
      const name = match ? match[1].trim() : (v.var_nombre || v.var_codigo);
      const unit = match ? match[2].trim() : '';
      const isWind = v.tipo === TIPO_VELOCIDAD_VIENTO;
      const chartType = v.es_acumulada ? 'bar' : 'line';
      return {
        id: v.var_id,
        code: v.var_codigo,
        name: isWind ? 'Viento' : name,
        unit,
        label: isWind ? 'Viento (dirección y velocidad)' : `${name} (${unit})`,
        accumulated: !!v.es_acumulada,
        chartType,
        color: CHART_COLORS[chartType]
      };
    });

  Object.keys(VARIABLES_CONFIG).forEach((k) => delete VARIABLES_CONFIG[k]);
  variables.forEach((v) => { VARIABLES_CONFIG[v.code] = v; });
  return variables;
}

// Cache: var_codigo → Set de est_codigo que miden esa variable
const estacionesPorVariable = new Map();

/**
 * Carga desde point_geojson los códigos de estación que miden la variable.
 * @param {string} variableCode var_codigo (ej. PRE)
 * @returns {Promise<Set<string>>}
 */
export async function loadEstacionesPorVariable(variableCode) {
  if (estacionesPorVariable.has(variableCode)) return estacionesPorVariable.get(variableCode);
  const res = await fetch(`/api/sedc/point_geojson?section=hydroclimate&variable=${encodeURIComponent(variableCode)}`);
  if (!res.ok) throw new Error(`Estaciones por variable no disponibles (${res.status})`);
  const geojson = await res.json();
  const codigos = new Set((geojson.features || []).map((f) => f.properties?.est_codigo).filter(Boolean));
  estacionesPorVariable.set(variableCode, codigos);
  return codigos;
}

/**
 * Comprueba si una estación mide la variable, según point_geojson de la API.
 * Requiere haber llamado antes a loadEstacionesPorVariable(variableCode).
 * @param {Object} estacion
 * @param {string} variableCode
 * @returns {boolean}
 */
export function estacionTieneVariable(estacion, variableCode = 'PRE') {
  const codigos = estacionesPorVariable.get(variableCode);
  return !!codigos && codigos.has(estacion.codigo);
}

export const FRECUENCIA_SEDC_IDS = {
  'horario': 3,
  'diario': 4,
  'mensual': 5
};

/**
 * Consulta la API en vivo de SEDC de FONAG para datos por periodo.
 * Endpoint: POST /api/sedc/reportes/consultas_periodo
 * @param {Object} estacion
 * @param {string} variableCode
 * @param {string} startDate
 * @param {string} endDate
 * @param {string} frecuencia
 * @returns {Promise<Array<{ fecha: string, valor: number, validado: boolean }>>}
 */
export async function fetchSeriesDeTiempo(estacion, variableCode = 'PRE', startDate = '2023-01-01', endDate = '2023-12-31', frecuencia = 'diario') {
  const estId = estacion.id || estacion.est_id || 50;
  const varId = VARIABLES_CONFIG[variableCode]?.id;
  if (!varId) return [];
  const frecId = FRECUENCIA_SEDC_IDS[frecuencia] || 4;

  try {
    const res = await fetch('/api/sedc/reportes/consultas_periodo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        estacion: estId,
        variable: varId,
        frecuencia: frecId,
        fecha_inicio: startDate,
        fecha_fin: endDate
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.response && data.grafico && Array.isArray(data.grafico.data) && data.grafico.data.length > 0) {
        // Wind speed comes as a wind rose (barpolar traces) with no time series
        if (data.grafico.data.some((t) => t.type === 'barpolar')) {
          const rose = [];
          rose.figure = data.grafico;
          return rose;
        }

        const trace = data.grafico.data[0];
        const xs = trace.x || [];
        const ys = trace.y || [];

        const points = [];
        for (let i = 0; i < xs.length; i++) {
          const rawVal = parseFloat(ys[i]);
          points.push({
            fecha: xs[i].replace('T', ' ').substring(0, 19),
            valor: isNaN(rawVal) ? 0 : rawVal,
            validado: true
          });
        }
        // Keep Django's Plotly figure (all traces + Acumulado/Promedio/Máx/Mín annotations)
        // so the chart matches SEDC; the points above feed the table preview and CSV export
        points.figure = data.grafico;
        return points;
      }
    }
  } catch (err) {
    console.warn('[PeriodoService] Error al consultar API SEDC en vivo:', err);
  }

  // Fallback si la API no reporta datos para ese rango específico
  return getSeriesDeTiempo(estacion, variableCode, startDate, endDate, frecuencia);
}

/**
 * Genera puntos de serie de tiempo entre startDate y endDate para una estación y variable (Fallback).
 * @param {Object} estacion
 * @param {string} variableCode
 * @param {string} startDate 'YYYY-MM-DD'
 * @param {string} endDate 'YYYY-MM-DD'
 * @param {string} frecuencia 'diario' | 'horario' | 'mensual'
 * @returns {Array<{ fecha: string, valor: number, validado: boolean }>}
 */
export function getSeriesDeTiempo(estacion, variableCode = 'PRE', startDate = '2026-01-01', endDate = '2026-09-03', frecuencia = 'diario') {
  const config = VARIABLES_CONFIG[variableCode];
  // The API catalog has no value ranges to simulate from, so no synthetic data is generated
  if (!config || config.defaultMin === undefined) return [];
  const seed = (typeof estacion.id === 'number' ? estacion.id : 42) + (variableCode.charCodeAt(0) || 10);

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return [];
  }

  const points = [];
  let current = new Date(start);

  let stepDays = 1;
  if (frecuencia === 'mensual') stepDays = 30;
  else if (frecuencia === 'horario') stepDays = 0.25; // 6 horas para rendimiento óptimo

  let i = 0;
  while (current <= end && i < 200) {
    const rnd = ((seed * (i + 13) * 9301 + 49297) % 233280) / 233280;
    const dayOfYear = Math.floor((current - new Date(current.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const seasonWave = Math.sin((dayOfYear / 365) * 2 * Math.PI) * 0.35 + 0.65;

    let valor = 0;
    if (config.code === 'PRE') {
      const rainyDay = rnd > 0.45;
      valor = rainyDay ? Math.round((rnd * config.defaultMax * seasonWave) * 10) / 10 : 0;
    } else if (config.code === 'TEM') {
      valor = Math.round((config.defaultMin + (config.defaultMax - config.defaultMin) * seasonWave + (rnd - 0.5) * 4) * 10) / 10;
    } else if (config.code === 'CAU') {
      valor = Math.round((config.defaultMin + (config.defaultMax - config.defaultMin) * seasonWave * (0.6 + rnd * 0.8)) * 100) / 100;
    } else {
      valor = Math.round((config.defaultMin + (config.defaultMax - config.defaultMin) * (0.4 + rnd * 0.6)) * 10) / 10;
    }

    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    const fechaFormatted = frecuencia === 'horario'
      ? `${year}-${month}-${day} ${String(Math.floor((i % 4) * 6)).padStart(2, '0')}:00`
      : `${year}-${month}-${day}`;

    points.push({
      fecha: fechaFormatted,
      valor: Math.max(0, valor),
      validado: true
    });

    if (frecuencia === 'mensual') {
      current.setMonth(current.getMonth() + 1);
    } else if (frecuencia === 'horario') {
      current.setHours(current.getHours() + 6);
    } else {
      current.setDate(current.getDate() + 1);
    }
    i++;
  }

  return points;
}

/**
 * Exporta la serie de tiempo a un archivo CSV estándar descargable.
 * @param {Object} estacion
 * @param {string} variableCode
 * @param {Array<Object>} series
 * @param {string} frecuencia
 */
export function exportarSerieCsv(estacion, variableCode, series, frecuencia = 'diario') {
  const config = VARIABLES_CONFIG[variableCode] || { code: variableCode, name: variableCode, unit: '' };
  const isSubhorario = frecuencia.toLowerCase().includes('subhorario') || frecuencia.toLowerCase().includes('horario');
  const ext = isSubhorario ? 'csv' : 'xlsx';

  let content = `FONAG - SEDC Sistema de Estandarización de Datos Crudos\n`;
  content += `Consulta: Series de tiempo por periodo\n`;
  content += `Código Estación: ${estacion.codigo}\n`;
  content += `Nombre Estación: ${estacion.nombre}\n`;
  content += `Tipo: ${estacion.tipo}\n`;
  content += `Variable: ${config.name} (${config.unit})\n`;
  content += `Frecuencia: ${frecuencia}\n`;
  content += `Fecha de exportación: ${new Date().toISOString().substring(0, 10)}\n\n`;

  content += `Fecha,Valor_${config.code}_${config.unit},Estado\n`;

  series.forEach((item) => {
    content += `"${item.fecha}",${item.valor},${item.validado ? 'Validado' : 'Sin validar'}\n`;
  });

  const mimeType = isSubhorario ? 'text/csv;charset=utf-8;' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${estacion.codigo}_${config.code}_${frecuencia}.${ext}`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
