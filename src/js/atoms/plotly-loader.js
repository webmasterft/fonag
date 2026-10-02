/**
 * Atom: Plotly lazy loader
 * Plotly (~3 MB) is only needed to render the figures returned by SEDC, so it is loaded on demand
 * and shared by every chart module.
 */
let plotlyPromise = null;

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
