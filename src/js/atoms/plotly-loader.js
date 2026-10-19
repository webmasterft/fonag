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
    // Only touch marker/line when the trace has them: Plotly breaks on keys set to undefined
    // ("Cannot use 'in' operator to search for 'line' in undefined"), e.g. threshold lines.
    const out = { ...trace };
    if (trace.marker) out.marker = { ...trace.marker, color: fixHex(trace.marker.color) };
    if (trace.line) out.line = { ...trace.line, color: fixHex(trace.line.color) };

    const isLineTrace = trace.type === undefined || trace.type === 'scatter' || trace.type === 'scattergl';
    const markerColor = typeof out.marker?.color === 'string' ? out.marker.color : null;
    if (isLineTrace && markerColor && !out.line?.color) {
      out.line = { ...(out.line || {}), color: markerColor };
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
