/**
 * Service: Anuario Hidroclimático
 * Provee la matriz estadística anual (12 meses + Resumen) para la estación y año consultado.
 */

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Genera el resumen estadístico de 12 meses para una estación.
 * Sigue la estructura de variables del SEDC (Precipitación, Temperatura, Caudal).
 * @param {Object} estacion
 * @param {number|string} year
 * @returns {Array<Object>}
 */
export function getAnuarioEstadistico(estacion, year = 2025) {
  // Generador determinista basado en el ID y año para reproducibilidad
  const seed = (typeof estacion.id === 'number' ? estacion.id : 42) + Number(year);
  const isHicro = estacion.tipo === 'Hidrológica';

  let totalPrecip = 0;
  let sumaTempMedia = 0;
  let maxAbsAnual = -999;
  let minAbsAnual = 999;
  let sumaCaudal = 0;

  const rows = MESES.map((mes, index) => {
    // Variaciones estacionales realistas de la región andina / cuencas de Quito
    const seasonalFactor = Math.sin((index / 11) * Math.PI) * 0.4 + 0.8;
    const rnd = ((seed * (index + 7) * 9301 + 49297) % 233280) / 233280;

    const precipTotal = Math.round((80 + rnd * 110) * seasonalFactor * 10) / 10;
    const precipMax = Math.round((precipTotal * (0.2 + rnd * 0.25)) * 10) / 10;
    const precipDia = Math.floor(1 + rnd * 27);

    const tempMedia = Math.round((11.5 + (seasonalFactor - 0.8) * 4 + rnd * 1.8) * 10) / 10;
    const tempMax = Math.round((tempMedia + 7.5 + rnd * 3.5) * 10) / 10;
    const tempMin = Math.round((tempMedia - 6.5 - rnd * 2.5) * 10) / 10;

    const caudal = isHicro
      ? Math.round((1.2 + seasonalFactor * 1.5 + rnd * 0.8) * 100) / 100
      : null;

    totalPrecip += precipTotal;
    sumaTempMedia += tempMedia;
    sumaCaudal += (caudal || 0);
    if (tempMax > maxAbsAnual) maxAbsAnual = tempMax;
    if (tempMin < minAbsAnual) minAbsAnual = tempMin;

    return {
      mes,
      mesNumero: index + 1,
      precipitacionMax: precipMax,
      precipitacionDia: precipDia,
      precipitacionTotal: precipTotal,
      tempMaxAbs: tempMax,
      tempMinAbs: tempMin,
      tempMedia: tempMedia,
      caudalMedio: caudal !== null ? `${caudal.toFixed(2)} m³/s` : '-',
      humedadRelativa: `${Math.round(72 + rnd * 18)}%`,
    };
  });

  // Fila resumen anual
  const resumenAnual = {
    mes: 'Resumen Anual',
    mesNumero: 13,
    esResumen: true,
    precipitacionMax: Math.max(...rows.map((r) => r.precipitacionMax)),
    precipitacionDia: '-',
    precipitacionTotal: Math.round(totalPrecip * 10) / 10,
    tempMaxAbs: maxAbsAnual,
    tempMinAbs: minAbsAnual,
    tempMedia: Math.round((sumaTempMedia / 12) * 10) / 10,
    caudalMedio: isHicro ? `${(sumaCaudal / 12).toFixed(2)} m³/s` : '-',
    humedadRelativa: '79% (Promedio)',
  };

  return [...rows, resumenAnual];
}

/**
 * Exporta el anuario de la estación a formato CSV.
 * @param {Object} estacion
 * @param {Array<Object>} rows
 * @param {number|string} year
 */
export function exportAnuarioCsv(estacion, rows, year = 2025) {
  const headers = [
    'Mes',
    'Precipitación Máx (mm)',
    'Día Máx',
    'Precipitación Total (mm)',
    'Temp Máx Abs (°C)',
    'Temp Mín Abs (°C)',
    'Temp Media (°C)',
    'Caudal Medio',
    'Humedad Relativa'
  ];

  const csvRows = rows.map((r) => [
    `"${r.mes}"`,
    r.precipitacionMax,
    `"${r.precipitacionDia}"`,
    r.precipitacionTotal,
    r.tempMaxAbs,
    r.tempMinAbs,
    r.tempMedia,
    `"${r.caudalMedio}"`,
    `"${r.humedadRelativa}"`
  ]);

  const csvContent = [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Anuario_${estacion.codigo}_${year}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Obtiene las series estructuradas para las 3 gráficas (Precipitación, Temperatura, Humedad).
 * @param {Object} estacion
 * @param {number|string} year
 * @returns {Object}
 */
export function getSeriesEstadisticas(estacion, year = 2025) {
  const rows = getAnuarioEstadistico(estacion, year).slice(0, 12);
  const labels = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  const seed = (typeof estacion.id === 'number' ? estacion.id : 42) + Number(year);

  // Precipitación (mm)
  const precipMensual = rows.map((r) => r.precipitacionTotal);
  const precipHistorica = precipMensual.map((val, i) => {
    const delta = Math.sin((i / 11) * Math.PI) * 15 - 8;
    return Math.max(15, Math.round((val + delta) * 10) / 10);
  });

  // Temperatura (°C)
  const tempMax = rows.map((r) => r.tempMaxAbs);
  const tempMin = rows.map((r) => r.tempMinAbs);
  const tempMedia = rows.map((r) => r.tempMedia);
  const tempHistorica = tempMedia.map((val, i) => {
    const offset = (((seed + i * 3) % 10) - 5) * 0.15;
    return Math.round((val + offset) * 10) / 10;
  });

  // Humedad (%)
  const humMedia = rows.map((r) => parseInt(r.humedadRelativa, 10));
  const humMax = humMedia.map((m) => Math.min(100, Math.round(m + 12)));
  const humMin = humMedia.map((m) => Math.max(35, Math.round(m - 16)));
  const humHistorica = humMedia.map((m, i) => {
    const offset = (((seed + i * 7) % 8) - 4);
    return Math.min(98, Math.max(40, m + offset));
  });

  return {
    labels,
    precipitacion: {
      mensual: precipMensual,
      mediaHistorica: precipHistorica,
    },
    temperatura: {
      maxima: tempMax,
      minima: tempMin,
      media: tempMedia,
      mediaHistorica: tempHistorica,
    },
    humedad: {
      maxima: humMax,
      minima: humMin,
      media: humMedia,
      mediaHistorica: humHistorica,
    }
  };
}
