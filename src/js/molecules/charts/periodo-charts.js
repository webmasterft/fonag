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
import { showInlineLoader } from '../../atoms/global-loader.js';
import { loadPlotly } from '../../atoms/plotly-loader.js';

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

let removeChartLoader = null;

/**
 * Shows the app loader card centered in the chart area until the chart finishes rendering.
 * The floating global loader keeps working independently (driven by the fetch interceptor).
 * @param {HTMLCanvasElement} canvasEl
 */
export function showPeriodoChartLoader(canvasEl) {
  destroyPeriodoChart();
  if (!canvasEl?.parentElement) return;
  canvasEl.style.display = 'none';
  removeChartLoader = showInlineLoader(canvasEl.parentElement, { subtitle: 'Cargando gráfico del periodo' });
}

function hideChartLoader() {
  removeChartLoader?.();
  removeChartLoader = null;
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
 * Renders the Plotly figure returned by SEDC (wind rose, time series) in place of the canvas.
 * @param {HTMLCanvasElement} canvasEl
 * @param {{ data: Array, layout: Object }} figure
 * @param {string} freqDisplay
 */
async function renderPlotlyFigure(canvasEl, figure, freqDisplay = '') {
  canvasEl.style.display = 'none';
  const el = document.createElement('div');
  el.style.width = '100%';
  el.style.height = '100%';
  canvasEl.parentElement.appendChild(el);
  activePlotlyEl = el;

  let Plotly;
  try {
    Plotly = await loadPlotly();
  } catch (err) {
    console.error('[PeriodoCharts] Plotly could not be loaded:', err);
    hideChartLoader();
    return;
  }
  if (activePlotlyEl !== el) return; // modal closed or re-rendered while loading

  // Django's layout sets a fixed height; let the modal container size the figure instead
  // Remove Acumulado text annotations and move legend to bottom
  const cleanAnnotations = (figure.layout?.annotations || []).filter(
    (a) => !/acumulado/i.test(a.text || '')
  );

  const cleanData = (figure.data || []).map((t) => {
    // If a trace itself is named Acumulado or shows Acumulado legend
    if (/acumulado/i.test(t.name || '')) {
      return { ...t, showlegend: false };
    }
    return t;
  });

  // Calcular dinámicamente el margen inferior según el número de series visibles
  const visibleTraces = cleanData.filter((t) => t.showlegend !== false);
  const totalNamesLength = visibleTraces.reduce((acc, t) => acc + (t.name ? t.name.length : 0), 0);

  let dynamicMarginBottom = 50;
  let dynamicLegendY = -0.16;

  if (visibleTraces.length > 0) {
    if (visibleTraces.length > 3 || totalNamesLength > 45) {
      dynamicMarginBottom = 120;
      dynamicLegendY = -0.19;
    } else {
      dynamicMarginBottom = 90;
      dynamicLegendY = -0.15;
    }
  }

  // Separar anotaciones estadísticas (Mínimo, Máximo, Promedio) de otras anotaciones
  const statsAnnotations = [];
  const otherAnnotations = [];

  cleanAnnotations.forEach((a) => {
    const text = a.text || '';
    if (/m[ií]nimo|m[aá]ximo|promedio/i.test(text)) {
      statsAnnotations.push(a);
    } else {
      otherAnnotations.push(a);
    }
  });

  const hasStats = statsAnnotations.length > 0;
  // Si hay estadísticas abajo de la leyenda, reservamos espacio inferior extra
  if (hasStats) {
    dynamicMarginBottom += 45;
  }

  // Agrupar o alinear las estadísticas debajo de la leyenda horizontalmente
  // Si hay 3 estadísticas (ej. Mín, Máx, Promedio), distribuirlas horizontalmente debajo de la leyenda
  const positionedStats = statsAnnotations.map((a, idx) => {
    const total = statsAnnotations.length;
    // Distribuir en el eje horizontal centrado debajo de la leyenda
    let xPos = 0.5;
    if (total === 3) {
      xPos = idx === 0 ? 0.25 : (idx === 1 ? 0.5 : 0.75);
    } else if (total === 2) {
      xPos = idx === 0 ? 0.35 : 0.65;
    }
    return {
      ...a,
      xref: 'paper',
      yref: 'paper',
      x: xPos,
      xanchor: 'center',
      y: dynamicLegendY - 0.12,
      yanchor: 'top',
      font: {
        family: "'Inter', sans-serif",
        size: 12,
        weight: 600,
        color: '#334155',
        ...(a.font || {})
      }
    };
  });

  const layout = {
    ...figure.layout,
    height: undefined,
    autosize: true,
    margin: { t: 40, r: 40, b: dynamicMarginBottom, l: 70 },
    legend: {
      orientation: 'h',
      x: 0.5,
      xanchor: 'center',
      y: dynamicLegendY,
      yanchor: 'top'
    },
    annotations: [...otherAnnotations, ...positionedStats]
  };

  // En frecuencias mensuales y anuales, el eje de porcentaje (yaxis2 o yaxis) debe decir "Porcentaje de Datos (%)" y tener rango [0, 100]
  const yaxis2Title = typeof layout.yaxis2?.title === 'string' ? layout.yaxis2.title : (layout.yaxis2?.title?.text || '');
  if (layout.yaxis2 && (/porcentaje/i.test(yaxis2Title) || /porcentaje/i.test(layout.yaxis2.title?.text || ''))) {
    if (typeof layout.yaxis2.title === 'string') {
      layout.yaxis2.title = 'Porcentaje de Datos (%)';
    } else {
      layout.yaxis2.title = { ...(layout.yaxis2.title || {}), text: 'Porcentaje de Datos (%)' };
    }
    layout.yaxis2.range = [0, 100];
    layout.yaxis2.autorange = false;
    layout.margin.r = 65;
  }

  const yaxisTitle = typeof layout.yaxis?.title === 'string' ? layout.yaxis.title : (layout.yaxis?.title?.text || '');
  if (/porcentaje/i.test(yaxisTitle)) {
    if (typeof layout.yaxis.title === 'string') {
      layout.yaxis.title = 'Porcentaje de Datos (%)';
    } else {
      layout.yaxis.title = { ...(layout.yaxis.title || {}), text: 'Porcentaje de Datos (%)' };
    }
    layout.yaxis.range = [0, 100];
    layout.yaxis.autorange = false;
  } else if (layout.yaxis?.title && freqDisplay) {
    // Mostrar la frecuencia en el eje Y principal del gráfico: ej. "Precipitación (mm) - Diaria"
    const currentYText = typeof layout.yaxis.title === 'string' ? layout.yaxis.title : (layout.yaxis.title.text || '');
    if (currentYText && !currentYText.includes(' - ')) {
      const updatedYText = `${currentYText} - ${freqDisplay}`;
      if (typeof layout.yaxis.title === 'string') {
        layout.yaxis.title = updatedYText;
      } else {
        layout.yaxis.title.text = updatedYText;
      }
    }
  }

  if (layout.xaxis?.domain) {
    layout.xaxis = { ...layout.xaxis, domain: [0, 1] };
  }

  try {
    await Plotly.newPlot(el, cleanData, layout, { responsive: true, displaylogo: false });
  } finally {
    if (activePlotlyEl === el) hideChartLoader();
  }
}

const FRECUENCIAS_FEMENINAS = {
  subhorario_validado: 'Subhoraria validada',
  subhorario: 'Subhoraria',
  horario: 'Horaria',
  diario: 'Diaria',
  mensual: 'Mensual',
  anual: 'Anual'
};

/**
 * Renderiza la gráfica de la serie de tiempo para la variable seleccionada.
 * @param {HTMLCanvasElement} canvasEl
 * @param {Array<{ fecha: string, valor: number }>} series
 * @param {Object} variableConfig
 * @param {string} frecuencia
 */
export function renderPeriodoChart(canvasEl, series, variableConfig, frecuencia = 'diario') {
  if (!canvasEl) return;
  // Plotly is loaded lazily: keep the loader visible until the figure is drawn
  destroyPeriodoChart({ keepLoader: !!series.figure });

  const freqDisplay = FRECUENCIAS_FEMENINAS[frecuencia] || (frecuencia ? frecuencia.charAt(0).toUpperCase() + frecuencia.slice(1) : 'Diaria');

  if (series.figure) {
    renderPlotlyFigure(canvasEl, series.figure, freqDisplay);
    return;
  }
  canvasEl.style.display = '';

  const labels = series.map((s) => s.fecha);
  const values = series.map((s) => s.valor);

  const isBar = variableConfig.chartType === 'bar';

  activeChart = new Chart(canvasEl, {
    type: isBar ? 'bar' : 'line',
    data: {
      labels,
      datasets: [
        {
          label: `${variableConfig.name} (${variableConfig.unit}) - ${freqDisplay}`,
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
          display: false
        },
        legend: {
          display: !isBar, // Si es barra de precipitación se oculta; en otros gráficos se ubica abajo
          position: 'bottom',
          labels: {
            boxWidth: 12,
            font: { family: "'Inter', sans-serif", size: 12, weight: 600 },
            color: '#334155',
            padding: 16
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
          title: {
            display: true,
            text: `${variableConfig.name} (${variableConfig.unit}) - ${freqDisplay}`,
            font: { family: "'Inter', sans-serif", size: 12, weight: 600 },
            color: '#475569'
          },
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
