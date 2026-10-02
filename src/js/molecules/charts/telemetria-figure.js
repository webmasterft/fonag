/**
 * Molecule: Telemetry figure (SEDC)
 * Builds the same Plotly figure as SEDC's /static/telemetria/visualizar.js from one
 * /ajax/telemetria/consulta item: data trace, upper/lower thresholds (U S / U i),
 * Máx, mín, Acumulado (precipitation) and the last reading in the legend.
 */

const PRECIPITATION_VAR_ID = '1';
const WIND_VAR_ID = '405';
const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

const toNumbers = (values = []) => values.map((v) => parseFloat(v)).filter((v) => !isNaN(v));

/** Legend-only entry (no visible mark), the way Django shows Máx/mín/Acumulado. */
const legendEntry = (name, x) => ({ name, x: [x], y: [null], type: 'scatter', mode: 'text', hoverinfo: 'skip' });

const thresholdLine = (name, value, x0, x1, color) => ({
  name,
  x: [x0, x1],
  y: [value, value],
  type: 'scatter',
  mode: 'lines',
  line: { color, width: 1 },
  hoverinfo: 'name'
});

function lastReadingText(value, unit, fecha = '') {
  return `Último: <b>${value} ${unit}</b><br>${fecha.slice(0, 10)} ${fecha.slice(11, 19)}`;
}

function buildSeriesFigure(item, isPrecipitation) {
  const fechas = item.datos?.fecha || [];
  const valores = item.datos?.valor || [];
  const unit = item.var_unidad || '';
  const numbers = toNumbers(valores);
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

  if (numbers.length) {
    if (isPrecipitation) {
      const acumulado = numbers.reduce((acc, v) => acc + v, 0).toFixed(2);
      data.push(legendEntry(`ACU: ${acumulado} ${unit}`, x0));
    }
    data.push(legendEntry(`Máx: ${Math.max(...numbers)} ${unit}`, x0));
    data.push(legendEntry(`mín: ${Math.min(...numbers)} ${unit}`, x0));
  }

  const lastValue = parseFloat(valores[valores.length - 1]);
  if (!isNaN(lastValue)) {
    data.push(legendEntry(lastReadingText(lastValue, unit, x1), x0));
  }

  return {
    data,
    layout: {
      title: { text: `${item.estacion}: ${item.var_nombre} (${unit})` },
      margin: { r: 10, t: 60, b: 45, l: 50 },
      legend: { orientation: 'v' }
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
  const numbers = toNumbers(velocidad);

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
      name: `Último dato:<br>Velocidad: ${lastSpeed} m/s<br>Dirección: desde ${cardinal} (${parseInt(String(lastDir), 10)}°)`,
      type: 'scatterpolar',
      r: [lastSpeed],
      theta: [lastDir],
      thetaunit: 'degrees',
      mode: 'markers',
      marker: { color: 'rgb(64, 64, 255)', size: 11, symbol: 'diamond', line: { color: 'rgb(30, 30, 150)', width: 2 } }
    });
  }
  if (numbers.length) {
    data.push({
      name: `Máx: ${Math.max(...numbers)} m/s`,
      type: 'scatterpolar',
      r: [null],
      theta: [0],
      mode: 'text',
      hoverinfo: 'skip'
    });
  }

  return {
    data,
    layout: {
      title: { text: `${item.estacion}: ${item.var_nombre} (${item.var_unidad || ''})` },
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
 * @returns {{ data: Array, layout: Object } | null}
 */
export function buildTelemetriaFigure(varId, item) {
  if (!item?.datos) return null;
  if (String(varId) === WIND_VAR_ID) return buildWindFigure(item);
  return buildSeriesFigure(item, String(varId) === PRECIPITATION_VAR_ID);
}
