/**
 * Atom: Plotly lazy loader
 * Plotly (~3 MB) is only needed to render the figures returned by SEDC, so it is loaded on demand
 * and shared by every chart module.
 */
let plotlyPromise = null;

const BARE_HEX = /^([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const fixHex = (color) => (typeof color === 'string' && BARE_HEX.test(color) ? `#${color}` : color);

/**
 * Adapts SEDC figures (built for Plotly 3) to the bundled Plotly version:
 * - SEDC sends hex colors without '#' (e.g. "1660a7").
 * - SEDC sets only marker.color on line traces; older Plotly reused it for the line,
 *   newer versions fall back to the default colorway. The line keeps the marker color.
 * @param {Array<Object>} data Plotly traces
 * @returns {Array<Object>}
 */
export function normalizeSedcTraces(data = []) {
  return data.map((trace) => {
    const marker = trace.marker ? { ...trace.marker, color: fixHex(trace.marker.color) } : trace.marker;
    const line = trace.line ? { ...trace.line, color: fixHex(trace.line.color) } : undefined;
    const isLineTrace = trace.type === undefined || trace.type === 'scatter' || trace.type === 'scattergl';
    const markerColor = typeof marker?.color === 'string' ? marker.color : null;

    const out = { ...trace, marker };
    if (line || (isLineTrace && markerColor)) {
      out.line = { ...line, color: line?.color || markerColor };
    }
    return out;
  });
}

/**
 * @returns {Promise<Object>} Plotly module
 */
export function loadPlotly() {
  plotlyPromise ??= import('plotly.js-dist-min')
    .then((m) => m.default || m)
    .catch((err) => {
      plotlyPromise = null; // allow a retry on the next call
      throw err;
    });
  return plotlyPromise;
}
