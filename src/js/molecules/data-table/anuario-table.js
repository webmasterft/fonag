/**
 * Molecule: Anuario Statistical Data Table
 * Generador funcional de la tabla estadística mensual del Anuario Hidroclimático.
 */
import { exportAnuarioCsv } from '../../services/anuario-service.js';

/**
 * Renderiza la tabla estadística completa para una estación y año.
 * @param {HTMLElement} container
 * @param {Object} estacion
 * @param {Array<Object>} rows
 * @param {number|string} year
 */
export function renderAnuarioTable(container, estacion, rows, year = 2025) {
  if (!container) return;

  const html = `
    <div class="anuario-table-wrapper">
      <div class="anuario-table-toolbar">
        <div class="anuario-table-meta">
          <span class="station-tag">${estacion.codigo}</span>
          <h4 class="anuario-table-title">${estacion.nombre} — Anuario ${year}</h4>
          <span class="station-type-badge">${estacion.tipo}</span>
        </div>
        <button id="btn-export-csv" class="btn btn-navy-export" title="Exportar a CSV">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Exportar CSV
        </button>
      </div>

      <div class="table-responsive-container">
        <table class="fonag-data-table anuario-grid-table">
          <thead>
            <tr>
              <th rowspan="2" class="col-mes">Mes</th>
              <th colspan="3" class="col-group col-group-precip">Precipitación (mm)</th>
              <th colspan="3" class="col-group col-group-temp">Temperatura (°C)</th>
              <th rowspan="2">Caudal Medio</th>
              <th rowspan="2">Humedad Media</th>
            </tr>
            <tr>
              <th>Máx Abs</th>
              <th>Día</th>
              <th>Total Mensual</th>
              <th>Máx Abs</th>
              <th>Mín Abs</th>
              <th>Media</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => renderRow(row)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Enlazar botón de exportación CSV
  const exportBtn = container.querySelector('#btn-export-csv');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportAnuarioCsv(estacion, rows, year);
    });
  }
}

/**
 * Renderiza una fila individual (o fila de resumen anual).
 * @param {Object} row
 * @returns {string}
 */
function renderRow(row) {
  const isSummary = row.esResumen;
  const trClass = isSummary ? 'row-resumen-anual' : '';

  return `
    <tr class="${trClass}">
      <td class="cell-mes font-semibold">${row.mes}</td>
      <td class="text-right">${formatNumber(row.precipitacionMax)}</td>
      <td class="text-center">${row.precipitacionDia}</td>
      <td class="text-right font-medium">${formatNumber(row.precipitacionTotal)}</td>
      <td class="text-right text-danger">${formatNumber(row.tempMaxAbs)}</td>
      <td class="text-right text-primary">${formatNumber(row.tempMinAbs)}</td>
      <td class="text-right font-medium">${formatNumber(row.tempMedia)}</td>
      <td class="text-center">${row.caudalMedio}</td>
      <td class="text-center">${row.humedadRelativa}</td>
    </tr>
  `;
}

function formatNumber(val) {
  if (val === null || val === undefined || val === '-') return '-';
  if (typeof val === 'number') return val.toFixed(1);
  return val;
}
