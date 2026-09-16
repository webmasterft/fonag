/**
 * Molecule: Anuario Statistical Charts (Chart.js)
 * Renderiza las 3 gráficas (Precipitación, Temperatura, Humedad) con diseño idéntico al Figma.
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

// Registrar componentes modulares de Chart.js
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

let chartInstances = [];

/**
 * Destruye instancias previas para evitar memory leaks al cambiar de estación.
 */
export function destroyCharts() {
  chartInstances.forEach((chart) => {
    if (chart && typeof chart.destroy === 'function') {
      chart.destroy();
    }
  });
  chartInstances = [];
}

/**
 * Renderiza las 3 gráficas en el contenedor especificado.
 * @param {HTMLElement} container
 * @param {Object} seriesData
 */
export function renderEstadisticasCharts(container, seriesData) {
  if (!container) return;
  destroyCharts();

  const { labels, precipitacion, temperatura, humedad } = seriesData;

  const html = `
    <div class="charts-stack">
      <!-- Gráfica 1: Precipitación Mensual -->
      <div class="chart-card">
        <h4 class="chart-card-title">Precipitación Mensual (mm)</h4>
        <div class="chart-canvas-wrapper">
          <canvas id="chart-precipitacion"></canvas>
        </div>
      </div>

      <!-- Gráfica 2: Temperatura del Aire -->
      <div class="chart-card">
        <h4 class="chart-card-title">Temperatura del Aire (°C)</h4>
        <div class="chart-canvas-wrapper">
          <canvas id="chart-temperatura"></canvas>
        </div>
      </div>

      <!-- Gráfica 3: Humedad Relativa del Aire -->
      <div class="chart-card">
        <h4 class="chart-card-title">Humedad Relativa del Aire (%)</h4>
        <div class="chart-canvas-wrapper">
          <canvas id="chart-humedad"></canvas>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // 1. Chart Precipitación (Barras + Línea punteada)
  const ctxPrecip = container.querySelector('#chart-precipitacion');
  if (ctxPrecip) {
    const chartPrecip = new Chart(ctxPrecip, {
      data: {
        labels,
        datasets: [
          {
            type: 'line',
            label: 'Media histórica',
            data: precipitacion.mediaHistorica,
            borderColor: '#F19001',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 4,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#F19001',
            pointBorderWidth: 2,
            tension: 0.1,
            order: 1,
          },
          {
            type: 'bar',
            label: 'Mensual',
            data: precipitacion.mensual,
            backgroundColor: '#1e293b',
            borderRadius: 3,
            borderSkipped: false,
            barPercentage: 0.65,
            order: 2,
          }
        ]
      },
      options: getCommonOptions(180, 45, 'mm')
    });
    chartInstances.push(chartPrecip);
  }

  // 2. Chart Temperatura (Líneas múltiples)
  const ctxTemp = container.querySelector('#chart-temperatura');
  if (ctxTemp) {
    const chartTemp = new Chart(ctxTemp, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Media',
            data: temperatura.media,
            borderColor: '#1e293b',
            backgroundColor: '#1e293b',
            pointBorderColor: '#1e293b',
            pointBackgroundColor: '#ffffff',
            pointRadius: 3,
            pointHoverRadius: 6,
            borderWidth: 2,
            tension: 0.1,
          },
          {
            label: 'Media histórica',
            data: temperatura.mediaHistorica,
            borderColor: '#F19001',
            backgroundColor: '#F19001',
            pointBorderColor: '#F19001',
            pointBackgroundColor: '#ffffff',
            pointRadius: 3,
            pointHoverRadius: 6,
            borderDash: [5, 5],
            borderWidth: 2,
            tension: 0.1,
          },
          {
            label: 'Máxima',
            data: temperatura.maxima,
            borderColor: '#ef4444',
            backgroundColor: '#ef4444',
            pointBorderColor: '#ef4444',
            pointBackgroundColor: '#ffffff',
            pointRadius: 3,
            pointHoverRadius: 6,
            borderWidth: 2,
            tension: 0.1,
          },
          {
            label: 'Mínima',
            data: temperatura.minima,
            borderColor: '#3b82f6',
            backgroundColor: '#3b82f6',
            pointBorderColor: '#3b82f6',
            pointBackgroundColor: '#ffffff',
            pointRadius: 3,
            pointHoverRadius: 6,
            borderWidth: 2,
            tension: 0.1,
          }
        ]
      },
      options: getCommonOptions(24, 6, '°C')
    });
    chartInstances.push(chartTemp);
  }

  // 3. Chart Humedad (Líneas con Área rellena)
  const ctxHum = container.querySelector('#chart-humedad');
  if (ctxHum) {
    const chartHum = new Chart(ctxHum, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Máxima',
            data: humedad.maxima,
            borderColor: '#10b981',
            backgroundColor: '#10b981',
            pointRadius: 0,
            pointHoverRadius: 5,
            borderWidth: 2,
            tension: 0.2,
          },
          {
            label: 'Media',
            data: humedad.media,
            borderColor: '#1e293b',
            backgroundColor: '#1e293b',
            pointRadius: 0,
            pointHoverRadius: 5,
            borderWidth: 2,
            tension: 0.2,
          },
          {
            label: 'Media histórica',
            data: humedad.mediaHistorica,
            borderColor: '#F19001',
            backgroundColor: '#F19001',
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 5,
            borderWidth: 2,
            tension: 0.2,
          },
          {
            label: 'Mínima',
            data: humedad.minima,
            borderColor: '#ca8a04',
            backgroundColor: 'rgba(254, 240, 138, 0.45)',
            fill: 'origin',
            pointRadius: 0,
            pointHoverRadius: 5,
            borderWidth: 2,
            tension: 0.2,
          }
        ]
      },
      options: getCommonOptions(100, 25, '%')
    });
    chartInstances.push(chartHum);
  }
}

function getCommonOptions(maxY, stepY, unit = '') {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
          padding: 20,
          font: {
            family: "'Inter', sans-serif",
            size: 12,
            weight: 500,
          },
          color: '#475569',
        }
      },
      tooltip: {
        backgroundColor: '#ffffff',
        titleColor: '#1e293b',
        bodyColor: '#334155',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        titleFont: {
          family: "'Inter', sans-serif",
          size: 14,
          weight: 700,
        },
        bodyFont: {
          family: "'Inter', sans-serif",
          size: 13,
          weight: 600,
        },
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ' : ';
            }
            if (context.parsed.y !== null) {
              label += `${context.parsed.y} ${unit}`.trim();
            }
            return label;
          },
          labelTextColor: function (context) {
            return context.dataset.borderColor || '#1e293b';
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: '#f8fafc',
        },
        ticks: {
          font: {
            family: "'Inter', sans-serif",
            size: 11,
            weight: 600,
          },
          color: '#64748b',
        }
      },
      y: {
        beginAtZero: true,
        max: maxY,
        ticks: {
          stepSize: stepY,
          font: {
            family: "'Inter', sans-serif",
            size: 11,
          },
          color: '#64748b',
        },
        grid: {
          color: '#f1f5f9',
          borderColor: '#e2e8f0',
        }
      }
    }
  };
}
