/**
 * Page Controller: Consultas por Periodo
 * Conecta el mapa Leaflet, filtrado por fechas, variable hidroclimática obligatoria,
 * frecuencia, eje territorial, tarjetas con botones "Ver datos" / "Descargar" y modal analítico.
 */
import { fetchEstaciones } from '../services/estaciones-service.js';
import {
  VARIABLES_CONFIG,
  loadVariables,
  loadEstacionesPorVariable,
  estacionTieneVariable,
  fetchSeriesDeTiempo,
  exportarSerieCsv
} from '../services/periodo-service.js';
import { initLeafletMap } from '../molecules/map/leaflet-map.js';
import { renderPeriodoChart, destroyPeriodoChart, showPeriodoChartLoader } from '../molecules/charts/periodo-charts.js';
import { initThemeToggle } from '../organisms/theme-toggle.js';
import { initGlobalHttpLoader } from '../atoms/global-loader.js';
import { initCustomDatePickers } from '../molecules/datepicker/custom-datepicker.js';

/**
 * Rango de fechas por defecto: 1 de enero del año actual → hoy, en hora local.
 * @returns {{ start: string, end: string }} Fechas en formato YYYY-MM-DD
 */
const DEFAULT_VARIABLE = 'PRE';

function defaultRange() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return { start: `${yyyy}-01-01`, end: `${yyyy}-${mm}-${dd}` };
}

document.addEventListener('DOMContentLoaded', async () => {
  initGlobalHttpLoader();
  initThemeToggle();

  // Las fechas se asignan antes de iniciar el datepicker, que lee el valor inicial
  const { start, end } = defaultRange();
  ['input-fecha-inicio', 'input-fecha-fin'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = i === 0 ? start : end;
    el.max = end;
  });
  initCustomDatePickers();

  let activeEje = 'ALL';
  let activeFloatingTipo = 'ALL';

  // DOM Elements
  const inputFechaInicio = document.getElementById('input-fecha-inicio');
  const inputFechaFin = document.getElementById('input-fecha-fin');
  const selectVariable = document.getElementById('select-variable');
  const selectFrecuencia = document.getElementById('select-frecuencia');
  const btnLimpiar = document.getElementById('btn-periodo-limpiar');

  const inputCodigo = document.getElementById('input-periodo-codigo');
  const inputNombre = document.getElementById('input-periodo-nombre');
  const selectTipo = document.getElementById('select-periodo-tipo');
  const selectEje = document.getElementById('select-periodo-eje');
  const counterEl = document.getElementById('periodo-stations-counter');

  const cardsContainer = document.getElementById('periodo-cards-list');

  // Floating Legend Elements
  const countMeteoEl = document.getElementById('periodo-count-meteo');
  const countPluvioEl = document.getElementById('periodo-count-pluvio');
  const countHidroEl = document.getElementById('periodo-count-hidro');
  const legendItems = document.querySelectorAll('#periodo-map-tipo-legend .tipo-legend-item');

  // Modal Elements
  const modal = document.getElementById('periodo-modal');
  const modalHeader = document.getElementById('periodo-modal-header');
  const chartCanvas = document.getElementById('periodo-chart-canvas');
  const tablePreviewContainer = document.getElementById('periodo-table-preview-container');

  let allEstaciones = [];
  let currentModalEstacion = null;

  // Inicializar Leaflet Map
  const mapController = initLeafletMap('periodo-stations-map', {
    onEjeSelect: (eje) => {
      activeEje = eje;
      applyFilters();
    }
  });

  // 1. Cargar Estaciones del Servicio
  allEstaciones = await fetchEstaciones();

  // Poblar select de Eje de trabajo dinámicamente (igual que estaciones page)
  if (selectEje) {
    const ejesUnicos = Array.from(new Set(allEstaciones.map(e => e.eje_trabajo).filter(Boolean))).sort();
    selectEje.innerHTML = '<option value="">Todos los ejes</option>' +
      ejesUnicos.map(eje => `<option value="${eje}">${eje}</option>`).join('');
  }

  // Catálogo de variables desde la API SEDC (por defecto PRE si existe)
  try {
    const variables = await loadVariables();
    if (selectVariable) {
      selectVariable.innerHTML = variables
        .map((v) => `<option value="${v.code}">${v.label}</option>`)
        .join('');
      selectVariable.value = VARIABLES_CONFIG[DEFAULT_VARIABLE] ? DEFAULT_VARIABLE : (variables[0]?.code || '');
    }
    await loadEstacionesPorVariable(selectVariable?.value);
  } catch (err) {
    console.error('[Periodo] Error cargando variables:', err);
    if (selectVariable) selectVariable.innerHTML = '<option value="">Variables no disponibles</option>';
  }

  // 2. Renderizar inicial
  applyFilters();
  if (mapController) {
    setTimeout(() => mapController.invalidateSize(), 150);
  }

  // 3. Listeners de Filtros
  if (inputFechaInicio) {
    inputFechaInicio.addEventListener('change', applyFilters);
    inputFechaInicio.addEventListener('input', applyFilters);
  }
  if (inputFechaFin) {
    inputFechaFin.addEventListener('change', applyFilters);
    inputFechaFin.addEventListener('input', applyFilters);
  }
  if (selectVariable) selectVariable.addEventListener('change', onVariableChange);
  if (selectFrecuencia) selectFrecuencia.addEventListener('change', applyFilters);
  if (inputCodigo) inputCodigo.addEventListener('input', applyFilters);
  if (inputNombre) inputNombre.addEventListener('input', applyFilters);
  if (selectTipo) selectTipo.addEventListener('change', () => {
    activeFloatingTipo = 'ALL';
    legendItems.forEach(i => i.style.opacity = '1');
    applyFilters();
  });
  if (selectEje) selectEje.addEventListener('change', applyFilters);

  // Listeners de Leyenda Flotante
  legendItems.forEach((item) => {
    item.addEventListener('click', () => {
      const type = item.getAttribute('data-type');
      if (activeFloatingTipo === type) {
        activeFloatingTipo = 'ALL';
        legendItems.forEach((i) => i.style.opacity = '1');
      } else {
        activeFloatingTipo = type;
        legendItems.forEach((i) => {
          i.style.opacity = (i.getAttribute('data-type') === type) ? '1' : '0.4';
        });
      }
      applyFilters();
    });
  });

  // Las estaciones por variable vienen de point_geojson: cargarlas antes de filtrar
  async function onVariableChange() {
    const code = selectVariable?.value;
    try {
      await loadEstacionesPorVariable(code);
    } catch (err) {
      console.error('[Periodo] Error cargando estaciones de la variable:', err);
    }
    if (selectVariable?.value === code) applyFilters();
  }

  // Botón Limpiar
  if (btnLimpiar) {
    btnLimpiar.addEventListener('click', () => {
      if (inputFechaInicio) inputFechaInicio.value = defaultRange().start;
      if (inputFechaFin) inputFechaFin.value = defaultRange().end;
      if (selectVariable && VARIABLES_CONFIG[DEFAULT_VARIABLE]) selectVariable.value = DEFAULT_VARIABLE;
      if (selectFrecuencia) selectFrecuencia.value = 'diario';
      if (inputCodigo) inputCodigo.value = '';
      if (inputNombre) inputNombre.value = '';
      if (selectTipo) selectTipo.value = '';
      if (selectEje) selectEje.value = '';
      activeEje = 'ALL';
      activeFloatingTipo = 'ALL';
      legendItems.forEach((i) => i.style.opacity = '1');
      if (mapController) mapController.setEje('ALL');
      applyFilters();
    });
  }

  // Modal Backdrop Close
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  async function openModal(estacion) {
    if (!modal) return;
    currentModalEstacion = estacion;

    const varCode = selectVariable?.value || 'PRE';
    const varCfg = VARIABLES_CONFIG[varCode] || { code: varCode, name: varCode, unit: '', chartType: 'line' };
    const sDate = inputFechaInicio?.value || defaultRange().start;
    const eDate = inputFechaFin?.value || defaultRange().end;
    const freq = selectFrecuencia?.value || 'diario';

    // Mostrar modal con estado de carga mientras consulta la API real
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    renderModalHeader(estacion, varCfg, sDate, eDate, freq, []);
    // Loader de la app en el área del gráfico hasta que termine de dibujarse
    showPeriodoChartLoader(chartCanvas);
    if (tablePreviewContainer) tablePreviewContainer.innerHTML = '';

    const series = await fetchSeriesDeTiempo(estacion, varCode, sDate, eDate, freq);

    renderModalHeader(estacion, varCfg, sDate, eDate, freq, series);
    renderPeriodoChart(chartCanvas, series, varCfg);
    renderTablePreview(series, varCfg);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    destroyPeriodoChart();
  }

  function renderModalHeader(estacion, varCfg, sDate, eDate, freq, series) {
    if (!modalHeader) return;

    const normalizedTipo = (estacion.tipo || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const tipoClass = normalizedTipo ? `tipo-${normalizedTipo}` : 'tipo-hidrologica';
    const ejeName = estacion.eje_trabajo || estacion.cuenca || 'General';
    const alturaVal = estacion.altura ? `${estacion.altura} m.s.n.m.` : '3889 m.s.n.m.';
    const stationName = estacion.nombre || estacion.codigo || 'Tungurahua';

    modalHeader.innerHTML = `
      <div class="modal-header-top">
        <div class="modal-header-left">
          <div class="modal-title-row">
            <span class="modal-title-dot"></span>
            <h3 class="modal-station-title">${estacion.codigo} - ${stationName}</h3>
          </div>
          <div class="modal-type-pill ${tipoClass}">
            <span class="pill-dot"></span>
            <span>${estacion.tipo || 'Hidrológica'}</span>
          </div>
        </div>
        <button type="button" class="btn-modal-close-x" id="btn-periodo-close-modal" aria-label="Cerrar modal">X</button>
      </div>

      <div class="modal-header-bottom">
        <p class="modal-meta-info">Eje: ${ejeName} &bull; Altura: ${alturaVal} &bull; Periodo: ${sDate} - ${eDate} &bull; Frecuencia: ${freq}</p>
        <button type="button" class="btn-modal-download-navy" id="btn-modal-periodo-csv">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Descargar datos
        </button>
      </div>
    `;

    modalHeader.querySelector('#btn-periodo-close-modal')?.addEventListener('click', closeModal);
    modalHeader.querySelector('#btn-modal-periodo-csv')?.addEventListener('click', () => {
      exportarSerieCsv(estacion, varCfg.code, series, freq);
    });
  }

  function renderTablePreview(series, varCfg) {
    if (!tablePreviewContainer) return;
    if (series.figure && series.length === 0) {
      // Wind rose: SEDC returns frequency percentages per direction, not time-series records
      tablePreviewContainer.innerHTML = '';
      return;
    }
    const preview = series.slice(0, 10);

    tablePreviewContainer.innerHTML = `
      <h4 style="margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #242857;">Muestra de datos (primeros ${preview.length} registros de ${series.length})</h4>
      <div style="overflow-x: auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <th style="padding: 8px 12px; color: #475569; font-weight: 700;">Fecha</th>
              <th style="padding: 8px 12px; color: #475569; font-weight: 700;">Valor (${varCfg.unit})</th>
              <th style="padding: 8px 12px; color: #475569; font-weight: 700;">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${preview.map((p) => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 12px; color: #1e293b; font-weight: 500;">${p.fecha}</td>
                <td style="padding: 8px 12px; color: #1e293b; font-weight: 700;">${p.valor}</td>
                <td style="padding: 8px 12px; color: #10b981; font-weight: 600;">Validado</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Aplica los filtros reactivos y actualiza mapa, leyenda y tarjetas
   */
  function applyFilters() {
    const varCode = selectVariable?.value || 'PRE';
    const varCfg = VARIABLES_CONFIG[varCode] || { code: varCode, name: varCode, unit: '', chartType: 'line' };

    const qCodigo = (inputCodigo ? inputCodigo.value : '').trim().toLowerCase();
    const qNombre = (inputNombre ? inputNombre.value : '').trim().toLowerCase();
    const qTipo = selectTipo ? selectTipo.value : '';
    const qEje = selectEje ? selectEje.value : '';

    const sDate = inputFechaInicio?.value || defaultRange().start;
    const eDate = inputFechaFin?.value || defaultRange().end;

    // Conteos para leyenda flotante
    let countMeteo = 0;
    let countPluvio = 0;
    let countHidro = 0;

    allEstaciones.forEach((est) => {
      const matchPeriod = !est.fechaInicio || est.fechaInicio === 'N/D' || est.fechaInicio <= eDate;
      const matchVar = estacionTieneVariable(est, varCode);
      // Eje activo viene del mapa (click en polígono) O del select
      const matchMapEje = (activeEje === 'ALL') || (est.eje_trabajo && est.eje_trabajo.toUpperCase() === activeEje.toUpperCase());
      const matchSelectEje = !qEje || est.eje_trabajo === qEje;

      if (matchVar && matchMapEje && matchSelectEje && matchPeriod) {
        if (est.tipo?.includes('Hidro')) countHidro++;
        else if (est.tipo?.includes('Pluvio')) countPluvio++;
        else countMeteo++;
      }
    });

    if (countMeteoEl) countMeteoEl.textContent = countMeteo;
    if (countPluvioEl) countPluvioEl.textContent = countPluvio;
    if (countHidroEl) countHidroEl.textContent = countHidro;

    // Filtrar lista completa
    const filtered = allEstaciones.filter((est) => {
      const matchPeriod = !est.fechaInicio || est.fechaInicio === 'N/D' || est.fechaInicio <= eDate;
      const matchVar = estacionTieneVariable(est, varCode);
      const matchMapEje = (activeEje === 'ALL') || (est.eje_trabajo && est.eje_trabajo.toUpperCase() === activeEje.toUpperCase());
      const matchSelectEje = !qEje || est.eje_trabajo === qEje;
      const matchFloatingTipo = (activeFloatingTipo === 'ALL') || (est.tipo === activeFloatingTipo);
      const matchTipo = !qTipo || est.tipo.toLowerCase() === qTipo.toLowerCase();
      const matchCodigo = !qCodigo || est.codigo.toLowerCase().includes(qCodigo);
      const matchNombre = !qNombre || est.nombre.toLowerCase().includes(qNombre);

      return matchVar && matchMapEje && matchSelectEje && matchFloatingTipo && matchTipo && matchCodigo && matchNombre && matchPeriod;
    });

    // Actualizar texto contador
    if (counterEl) {
      counterEl.textContent = `${filtered.length} estaciones con ${varCfg.name.toLowerCase()}`;
    }

    // Actualizar marcadores en el mapa
    if (mapController) {
      mapController.setMarkers(filtered, (estacion, openData) => {
        if (openData) {
          openModal(estacion);
        } else {
          highlightCard(estacion.codigo);
        }
      }, {
        subtitle: `${varCfg.code} (${varCfg.unit})`,
        buttonText: `Ver serie ${varCfg.code}`
      });
    }

    // Renderizar tarjetas
    renderCards(filtered, varCode);
  }

  function renderCards(list, varCode) {
    if (!cardsContainer) return;

    if (list.length === 0) {
      cardsContainer.innerHTML = `
        <div style="padding: 2.5rem 1rem; text-align: center; color: #64748b; font-size: 14px;">
          No se encontraron estaciones con la variable y filtros seleccionados.
        </div>
      `;
      return;
    }

    cardsContainer.innerHTML = list.map((est) => {
      let pillClass = 'tipo-meteo';
      let dotColor = '#f59e0b';
      if (est.tipo?.includes('Hidro')) {
        pillClass = 'tipo-hidro';
        dotColor = '#38bdf8';
      } else if (est.tipo?.includes('Pluvio')) {
        pillClass = 'tipo-pluvio';
        dotColor = '#8b5cf6';
      }

      return `
        <article class="periodo-station-card" id="card-${est.codigo}" data-codigo="${est.codigo}">
          <div class="periodo-station-card-header">
            <span class="periodo-station-dot" style="background-color: ${dotColor};"></span>
            <div class="periodo-station-info">
              <span class="periodo-station-code">${est.codigo}</span>
              <span class="periodo-station-name">${est.nombre}</span>
            </div>
          </div>
          <div class="periodo-station-pill ${pillClass}">
            <span class="pill-dot" style="background-color: ${dotColor};"></span>
            ${est.tipo}
          </div>
          <div class="periodo-station-actions">
            <button class="btn-card-ver-datos-periodo" data-codigo="${est.codigo}">
              <span class="icon-sprite icon-sprite-01 icon-white" aria-hidden="true"></span>
              Ver datos
            </button>
            <button class="btn-card-descargar-periodo" data-codigo="${est.codigo}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Descargar
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Listeners de botones de las tarjetas
    cardsContainer.querySelectorAll('.btn-card-ver-datos-periodo').forEach((btn) => {
      btn.addEventListener('click', () => {
        const codigo = btn.getAttribute('data-codigo');
        const est = allEstaciones.find((e) => e.codigo === codigo);
        if (est) openModal(est);
      });
    });

    cardsContainer.querySelectorAll('.btn-card-descargar-periodo').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const codigo = btn.getAttribute('data-codigo');
        const est = allEstaciones.find((e) => e.codigo === codigo);
        if (est) {
          const sDate = inputFechaInicio?.value || defaultRange().start;
          const eDate = inputFechaFin?.value || defaultRange().end;
          const freq = selectFrecuencia?.value || 'diario';
          btn.disabled = true;
          const origText = btn.innerHTML;
          btn.innerHTML = 'Descargando...';
          try {
            const series = await fetchSeriesDeTiempo(est, varCode, sDate, eDate, freq);
            exportarSerieCsv(est, varCode, series, freq);
          } finally {
            btn.disabled = false;
            btn.innerHTML = origText;
          }
        }
      });
    });

    cardsContainer.querySelectorAll('.periodo-station-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const codigo = card.getAttribute('data-codigo');
        const est = allEstaciones.find((e) => e.codigo === codigo);
        if (est && mapController) {
          mapController.focusStation(est);
          highlightCard(codigo);
        }
      });
    });
  }

  function highlightCard(codigo) {
    cardsContainer?.querySelectorAll('.periodo-station-card').forEach((c) => {
      c.classList.remove('is-active');
    });
    const target = document.getElementById(`card-${codigo}`);
    if (target) {
      target.classList.add('is-active');
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
});
