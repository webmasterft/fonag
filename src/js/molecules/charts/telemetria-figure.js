/**
 * Molecule: Telemetry figure (SEDC)
 * Builds the same Plotly figure as SEDC's /static/telemetria/visualizar.js from one
 * /ajax/telemetria/consulta item: data trace and upper/lower thresholds (U S / U i).
 * The legend only lists the data and the thresholds (no Máx / mín / Último entries).
 */
import { escapeHtml } from '../../atoms/escape-html.js';

const PRECIPITATION_VAR_ID = '1';
const WIND_VAR_ID = '405';
const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

const thresholdLine = (name, value, x0, x1, color) => ({
  name,
  x: [x0, x1],
  y: [value, value],
  type: 'scatter',
  mode: 'lines',
  line: { color, width: 1 },
  hoverinfo: 'name'
});

function buildSeriesFigure(item, isPrecipitation) {
  const fechas = item.datos?.fecha || [];
  const valores = item.datos?.valor || [];
  const unit = item.var_unidad || '';
  const x0 = fechas[0];
  const x1 = fechas[fechas.length - 1];

  const data = [isPrecipitation
    ? { name: 'Datos', x: fechas, y: valores, type: 'bar', marker: { color: 'rgb(0, 90, 0)' } }
    : {
        name: 'Datos',
        x: fechas,
        y: valores,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: 'rgb(0, 90, 0)', width: 1 },
        marker: { size: 1, color: 'rgb(0, 90, 0)' },
        connectgaps: false
      }];

  if (item.umbral_superior) {
    data.push(thresholdLine(`U S: ${item.umbral_superior} ${unit}`, item.umbral_superior, x0, x1, 'rgb(255, 127, 0)'));
  }
  // Django draws the lower threshold only on line charts
  if (!isPrecipitation && item.umbral_inferior) {
    data.push(thresholdLine(`U i: ${item.umbral_inferior} ${unit}`, item.umbral_inferior, x0, x1, 'rgb(0, 127, 255)'));
  }

  return {
    data,
    layout: {
      // Plotly renders titles as pseudo-HTML: API strings are escaped
      title: { text: `${escapeHtml(item.estacion)}: ${escapeHtml(item.var_nombre)} (${escapeHtml(unit)})` },
      margin: { r: 10, t: 50, b: 60, l: 50 },
      legend: {
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: -0.2,
        yanchor: 'top'
      }
    }
  };
}

function buildWindFigure(item) {
  const velocidad = item.datos?.velocidad || [];
  const direccion = item.datos?.direccion || [];
  const n = velocidad.length;
  const lastSpeed = parseFloat(velocidad[n - 1]);
  const lastDir = direccion[n - 1];
  const cardinal = DIRECTIONS[Math.round((Number(lastDir) % 360) / 45) % 8];

  const data = [{
    name: 'Datos anteriores',
    type: 'scatterpolar',
    r: velocidad,
    theta: direccion,
    thetaunit: 'degrees',
    mode: 'markers',
    marker: { color: 'rgba(27,158,119, 0.3)', size: 10, line: { color: 'white' } },
    cliponaxis: false
  }];

  if (n > 0 && !isNaN(lastSpeed)) {
    data.push({
      // Plain legend label; the reading itself is shown on hover
      name: 'Último dato',
      hovertemplate: `Velocidad: ${lastSpeed} m/s<br>Dirección: desde ${cardinal} (${parseInt(String(lastDir), 10)}°)<extra></extra>`,
      type: 'scatterpolar',
      r: [lastSpeed],
      theta: [lastDir],
      thetaunit: 'degrees',
      mode: 'markers',
      marker: { color: 'rgb(64, 64, 255)', size: 11, symbol: 'diamond', line: { color: 'rgb(30, 30, 150)', width: 2 } }
    });
  }

  return {
    data,
    layout: {
      title: { text: `${escapeHtml(item.estacion)}: ${escapeHtml(item.var_nombre)} (${escapeHtml(item.var_unidad || '')})` },
      showlegend: true,
      margin: { r: 10, t: 60, b: 30, l: 30 },
      polar: {
        bgcolor: 'rgb(233, 233, 233)',
        angularaxis: {
          tickwidth: 2,
          linewidth: 3,
          direction: 'clockwise',
          tickmode: 'array',
          tickvals: [0, 45, 90, 135, 180, 225, 270, 315],
          ticktext: DIRECTIONS
        },
        radialaxis: { side: 'counterclockwise', showline: true, linewidth: 2, tickwidth: 2, gridcolor: '#FFF', gridwidth: 2 }
      }
    }
  };
}

/**
 * @param {string} varId SEDC variable key in the telemetry response (1 = precipitation, 405 = wind)
 * @param {Object} item One value of the /ajax/telemetria/consulta response
 * @param {{ subtitle?: string }} [options] subtitle: escaped HTML shown under the title
 * @returns {{ data: Array, layout: Object } | null}
 */
export function buildTelemetriaFigure(varId, item, { subtitle = '' } = {}) {
  if (!item?.datos) return null;
  const figure = String(varId) === WIND_VAR_ID
    ? buildWindFigure(item)
    : buildSeriesFigure(item, String(varId) === PRECIPITATION_VAR_ID);

  // Same "Eje • Periodo" line as the modal header and the other consultas.
  // `subtitle` must already be escaped HTML (it is built from API values by the page).
  if (subtitle) {
    figure.layout.title = {
      ...figure.layout.title,
      subtitle: { text: subtitle, font: { size: 12, color: '#64748b' } },
    };
    figure.layout.margin = { ...figure.layout.margin, t: Math.max(figure.layout.margin?.t || 0, 80) };
  }
  return figure;
}
