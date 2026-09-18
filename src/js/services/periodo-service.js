/**
 * Service: Consultas por Periodo
 * Gestiona la definición de variables hidroclimáticas, filtrado de estaciones por variable,
 * generación determinista de series de tiempo (horario, diario, mensual) y exportación a CSV.
 */

export const VARIABLES_CONFIG = {
  'PRE': {
    code: 'PRE',
    name: 'Precipitación',
    unit: 'mm',
    label: 'Precipitación (mm)',
    tiposCompatibles: ['Meteorológica', 'Pluviométrica', 'Hidrológica'],
    chartType: 'bar',
    color: '#3b82f6',
    defaultMin: 0,
    defaultMax: 45
  },
  'TEM': {
    code: 'TEM',
    name: 'Temperatura del Aire',
    unit: '°C',
    label: 'Temperatura (°C)',
    tiposCompatibles: ['Meteorológica'],
    chartType: 'line',
    color: '#f59e0b',
    defaultMin: 2,
    defaultMax: 22
  },
  'CAU': {
    code: 'CAU',
    name: 'Caudal',
    unit: 'm³/s',
    label: 'Caudal (m³/s)',
    tiposCompatibles: ['Hidrológica'],
    chartType: 'line',
    color: '#0284c7',
    defaultMin: 0.1,
    defaultMax: 8.5
  },
  'HUM': {
    code: 'HUM',
    name: 'Humedad Relativa',
    unit: '%',
    label: 'Humedad Relativa (%)',
    tiposCompatibles: ['Meteorológica'],
    chartType: 'line',
    color: '#10b981',
    defaultMin: 40,
    defaultMax: 98
  },
  'NIV': {
    code: 'NIV',
    name: 'Nivel de Agua',
    unit: 'm',
    label: 'Nivel de Agua (m)',
    tiposCompatibles: ['Hidrológica'],
    chartType: 'line',
    color: '#6366f1',
    defaultMin: 0.2,
    defaultMax: 3.5
  },
  'PRE_ATM': {
    code: 'PRE_ATM',
    name: 'Presión Atmosférica',
    unit: 'hPa',
    label: 'Presión Atmosférica (hPa)',
    tiposCompatibles: ['Meteorológica'],
    chartType: 'line',
    color: '#8b5cf6',
    defaultMin: 600,
    defaultMax: 780
  },
  'RAD': {
    code: 'RAD',
    name: 'Radiación Solar',
    unit: 'W/m²',
    label: 'Radiación Solar (W/m²)',
    tiposCompatibles: ['Meteorológica'],
    chartType: 'line',
    color: '#ec4899',
    defaultMin: 0,
    defaultMax: 1200
  },
  'VIE': {
    code: 'VIE',
    name: 'Velocidad del Viento',
    unit: 'm/s',
    label: 'Velocidad del Viento (m/s)',
    tiposCompatibles: ['Meteorológica'],
    chartType: 'line',
    color: '#14b8a6',
    defaultMin: 0,
    defaultMax: 16
  }
};

/**
 * Comprueba si una estación tiene sensores para la variable seleccionada.
 * @param {Object} estacion
 * @param {string} variableCode
 * @returns {boolean}
 */
export function estacionTieneVariable(estacion, variableCode = 'PRE') {
  const config = VARIABLES_CONFIG[variableCode] || VARIABLES_CONFIG['PRE'];
  const tipo = estacion.tipo || 'Meteorológica';
  return config.tiposCompatibles.includes(tipo);
}

/**
 * Genera puntos de serie de tiempo entre startDate y endDate para una estación y variable.
 * @param {Object} estacion
 * @param {string} variableCode
 * @param {string} startDate 'YYYY-MM-DD'
 * @param {string} endDate 'YYYY-MM-DD'
 * @param {string} frecuencia 'diario' | 'horario' | 'mensual'
 * @returns {Array<{ fecha: string, valor: number, validado: boolean }>}
 */
export function getSeriesDeTiempo(estacion, variableCode = 'PRE', startDate = '2026-01-01', endDate = '2026-09-03', frecuencia = 'diario') {
  const config = VARIABLES_CONFIG[variableCode] || VARIABLES_CONFIG['PRE'];
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
  const config = VARIABLES_CONFIG[variableCode] || VARIABLES_CONFIG['PRE'];

  let csv = `FONAG - SEDC Sistema de Estandarización de Datos Crudos\n`;
  csv += `Consulta: Series de tiempo por periodo\n`;
  csv += `Estación: ${estacion.codigo} - ${estacion.nombre}\n`;
  csv += `Tipo: ${estacion.tipo}\n`;
  csv += `Variable: ${config.name} (${config.unit})\n`;
  csv += `Frecuencia: ${frecuencia}\n`;
  csv += `Fecha de exportación: ${new Date().toISOString().substring(0, 10)}\n\n`;

  csv += `Fecha,Valor_${config.code}_${config.unit},Estado\n`;

  series.forEach((item) => {
    csv += `"${item.fecha}",${item.valor},${item.validado ? 'Validado' : 'Sin validar'}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Serie_${estacion.codigo}_${config.code}_${frecuencia}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
