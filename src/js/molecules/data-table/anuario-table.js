/**
 * Molecule: Anuario Statistical Data Table
 * Generador funcional de la tabla estadística mensual del Anuario Hidroclimático.
 */
import { exportAnuarioCsv } from '../../services/anuario-service.js';
import { initColumnFilter } from './column-filter.js';

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
        <div style="display: flex; align-items: center; gap: 10px;">
          <button type="button" class="btn-columnas-dropdown">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <line x1="15" y1="3" x2="15" y2="21"></line>
            </svg>
            Columnas
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <button id="btn-export-csv" class="btn btn-navy-export" title="Exportar a CSV">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exportar CSV
          </button>
        </div>
      </div>

      <div class="table-responsive-container">
        <table class="fonag-data-table anuario-grid-table">
          <thead>
            <tr>
              <th rowspan="2" class="col-mes" data-col="mes">Mes</th>
              <th colspan="3" class="col-group col-group-precip" data-col="precipitacion">Precipitación (mm)</th>
              <th colspan="3" class="col-group col-group-temp" data-col="temperatura">Temperatura (°C)</th>
              <th rowspan="2" data-col="caudal">Caudal Medio</th>
              <th rowspan="2" data-col="humedad">Humedad Media</th>
            </tr>
            <tr>
              <th data-col="precipitacion">Máx Abs</th>
              <th data-col="precipitacion">Día</th>
              <th data-col="precipitacion">Total Mensual</th>
              <th data-col="temperatura">Máx Abs</th>
              <th data-col="temperatura">Mín Abs</th>
              <th data-col="temperatura">Media</th>
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

  // Inicializar filtro de columnas
  const btnCol = container.querySelector('.btn-columnas-dropdown');
  const tableEl = container.querySelector('.anuario-grid-table');
  if (btnCol && tableEl) {
    initColumnFilter(btnCol, tableEl, [
      { key: 'mes', label: 'Mes', defaultVisible: true },
      { key: 'precipitacion', label: 'Precipitación', defaultVisible: true },
      { key: 'temperatura', label: 'Temperatura', defaultVisible: true },
      { key: 'caudal', label: 'Caudal Medio', defaultVisible: true },
      { key: 'humedad', label: 'Humedad Media', defaultVisible: true }
    ]);
  }

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
      <td class="cell-mes font-semibold" data-col="mes">${row.mes}</td>
      <td class="text-right" data-col="precipitacion">${formatNumber(row.precipitacionMax)}</td>
      <td class="text-center" data-col="precipitacion">${row.precipitacionDia}</td>
      <td class="text-right font-medium" data-col="precipitacion">${formatNumber(row.precipitacionTotal)}</td>
      <td class="text-right text-danger" data-col="temperatura">${formatNumber(row.tempMaxAbs)}</td>
      <td class="text-right text-primary" data-col="temperatura">${formatNumber(row.tempMinAbs)}</td>
      <td class="text-right font-medium" data-col="temperatura">${formatNumber(row.tempMedia)}</td>
      <td class="text-center" data-col="caudal">${row.caudalMedio}</td>
      <td class="text-center" data-col="humedad">${row.humedadRelativa}</td>
    </tr>
  `;
}

function formatNumber(val) {
  if (val === null || val === undefined || val === '-') return '-';
  if (typeof val === 'number') return val.toFixed(1);
  return val;
}
