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
  Filler
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
  Filler
);

let activeChart = null;

export function destroyPeriodoChart() {
  if (activeChart && typeof activeChart.destroy === 'function') {
    activeChart.destroy();
  }
  activeChart = null;
}

/**
 * Renderiza la gráfica de la serie de tiempo para la variable seleccionada.
 * @param {HTMLCanvasElement} canvasEl
 * @param {Array<{ fecha: string, valor: number }>} series
 * @param {Object} variableConfig
 */
export function renderPeriodoChart(canvasEl, series, variableConfig) {
  if (!canvasEl) return;
  destroyPeriodoChart();

  const labels = series.map((s) => s.fecha);
  const values = series.map((s) => s.valor);

  const isBar = variableConfig.chartType === 'bar';

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
