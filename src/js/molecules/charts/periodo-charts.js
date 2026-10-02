/**
 * Molecule: Time Series Chart & Table Controller for Consultas por Periodo
 */
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
  SubTitle
} from 'chart.js';

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
  SubTitle
);

let activeChart = null;
let activePlotlyEl = null;
let plotlyPromise = null;

// Plotly (~3 MB) is only needed for the wind rose, so it is loaded on demand
function loadPlotly() {
  plotlyPromise ??= import('plotly.js-dist-min').then((m) => m.default || m);
  return plotlyPromise;
}

let activeLoaderEl = null;

/**
 * Shows the app's branded loader card (same markup as the global loader) over the chart area.
 * It stays until the chart finishes rendering or the chart is destroyed.
 * @param {HTMLCanvasElement} canvasEl
 */
export function showPeriodoChartLoader(canvasEl) {
  if (!canvasEl?.parentElement) return;
  destroyPeriodoChart();
  canvasEl.style.display = 'none';
  const el = document.createElement('div');
  el.setAttribute('aria-live', 'polite');
  el.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;';
  el.innerHTML = `
    <div class="fonag-loader-card">
      <div class="fonag-loader-spinner-wrapper">
        <div class="fonag-loader-ring"></div>
        <div class="fonag-loader-inner-dot"></div>
      </div>
      <div class="fonag-loader-text-group">
        <span class="fonag-loader-title">Consultando servidor...</span>
        <span class="fonag-loader-subtitle">Cargando gráfico del periodo</span>
      </div>
    </div>
  `;
  canvasEl.parentElement.appendChild(el);
  activeLoaderEl = el;
}

function hideChartLoader() {
  activeLoaderEl?.remove();
  activeLoaderEl = null;
}

export function destroyPeriodoChart({ keepLoader = false } = {}) {
  if (!keepLoader) hideChartLoader();
  if (activeChart && typeof activeChart.destroy === 'function') {
    activeChart.destroy();
  }
  activeChart = null;

  if (activePlotlyEl) {
    const el = activePlotlyEl;
    loadPlotly().then((Plotly) => Plotly.purge(el));
    el.remove();
    activePlotlyEl = null;
  }
}

/**
 * Renders the Plotly figure returned by SEDC (wind rose) in place of the canvas.
 * @param {HTMLCanvasElement} canvasEl
 * @param {{ data: Array, layout: Object }} figure
 */
async function renderPlotlyFigure(canvasEl, figure) {
  canvasEl.style.display = 'none';
  const el = document.createElement('div');
  el.style.width = '100%';
  el.style.height = '100%';
  canvasEl.parentElement.appendChild(el);
  activePlotlyEl = el;

  const Plotly = await loadPlotly();
  if (activePlotlyEl !== el) return; // modal closed or re-rendered while loading

  // Django's layout sets a fixed height; let the modal container size the figure instead
  const layout = { ...figure.layout, height: undefined, autosize: true, margin: { t: 50, r: 30, b: 50, l: 70 } };

  // Django reserves only 10% on the right for legend + stats, too narrow for the modal width:
  // widen that column and move legend/annotations into it (wind rose has no x axis, skip it)
  if (layout.xaxis?.domain) {
    const side = 0.8;
    layout.xaxis = { ...layout.xaxis, domain: [0, side - 0.03] };
    layout.legend = { ...layout.legend, x: side, xanchor: 'left', y: 1, yanchor: 'top' };
    layout.annotations = (layout.annotations || []).map((a) =>
      a.xref === 'paper' && a.x >= 0.9 ? { ...a, x: side } : a
    );
  }
  await Plotly.newPlot(el, figure.data, layout, { responsive: true, displaylogo: false });
  if (activePlotlyEl === el) hideChartLoader();
}

/**
 * Renderiza la gráfica de la serie de tiempo para la variable seleccionada.
 * @param {HTMLCanvasElement} canvasEl
 * @param {Array<{ fecha: string, valor: number }>} series
 * @param {Object} variableConfig
 */
export function renderPeriodoChart(canvasEl, series, variableConfig) {
  if (!canvasEl) return;
  // Plotly is loaded lazily: keep the loader visible until the figure is drawn
  destroyPeriodoChart({ keepLoader: !!series.figure });

  if (series.figure) {
    renderPlotlyFigure(canvasEl, series.figure);
    return;
  }
  canvasEl.style.display = '';

  const labels = series.map((s) => s.fecha);
  const values = series.map((s) => s.valor);

  const isBar = variableConfig.chartType === 'bar';

  // Accumulated variables (precipitation): prefer the API total, otherwise sum the series
  const acumulado = isBar
    ? (series.acumulado ?? values.reduce((acc, v) => acc + (Number(v) || 0), 0))
    : null;

  activeChart = new Chart(canvasEl, {
    type: isBar ? 'bar' : 'line',
    data: {
      labels,
      datasets: [
        {
          label: `${variableConfig.name} (${variableConfig.unit})`,
          data: values,
          backgroundColor: isBar ? 'rgba(59, 130, 246, 0.75)' : 'rgba(241, 144, 1, 0.15)',
          borderColor: isBar ? '#2563eb' : (variableConfig.color || '#F19001'),
          borderWidth: 2,
          pointRadius: series.length > 50 ? 1 : 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: variableConfig.color || '#F19001',
          pointBorderWidth: 2,
          fill: !isBar,
          tension: 0.2,
          borderRadius: isBar ? 3 : 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        subtitle: {
          display: acumulado !== null,
          text: acumulado !== null ? `Acumulado: ${acumulado.toFixed(2)} ${variableConfig.unit}` : '',
          align: 'end',
          color: '#334155',
          font: { family: "'Inter', sans-serif", size: 13, weight: 700 },
          padding: { bottom: 8 }
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 12,
            font: { family: "'Inter', sans-serif", size: 12, weight: 600 },
            color: '#334155'
          }
        },
        tooltip: {
          backgroundColor: '#ffffff',
          titleColor: '#1e293b',
          bodyColor: '#334155',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (ctx) => `${variableConfig.name}: ${ctx.parsed.y} ${variableConfig.unit}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#f8fafc' },
          ticks: {
            maxTicksLimit: 14,
            // Axis shows only the date; the tooltip keeps the full timestamp
            callback: function (value) {
              return String(this.getLabelForValue(value)).split(/[ T]/)[0];
            },
            font: { family: "'Inter', sans-serif", size: 11 },
            color: '#64748b'
          }
        },
        y: {
          beginAtZero: true,
          grid: { color: '#f1f5f9' },
          ticks: {
            font: { family: "'Inter', sans-serif", size: 11 },
            color: '#64748b',
            callback: (val) => `${val} ${variableConfig.unit}`
          }
        }
      }
    }
  });
}
