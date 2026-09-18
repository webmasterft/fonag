/**
 * Page Controller: Consultas por Periodo
 * Conecta el mapa Leaflet, filtrado por fechas, variable hidroclimática obligatoria,
 * frecuencia, eje territorial, tarjetas con botones "Ver datos" / "Descargar" y modal analítico.
 */
import { fetchEstaciones } from '../services/estaciones-service.js';
import {
  VARIABLES_CONFIG,
  estacionTieneVariable,
  getSeriesDeTiempo,
  exportarSerieCsv
} from '../services/periodo-service.js';
import { initLeafletMap, getEjeForCoords } from '../molecules/map/leaflet-map.js';
import { renderPeriodoChart, destroyPeriodoChart } from '../molecules/charts/periodo-charts.js';
import { initThemeToggle } from '../organisms/theme-toggle.js';
import { initGlobalHttpLoader } from '../atoms/global-loader.js';

document.addEventListener('DOMContentLoaded', async () => {
  initGlobalHttpLoader();
  initThemeToggle();

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
  const rawEstaciones = await fetchEstaciones();
  allEstaciones = rawEstaciones.map((est) => ({
    ...est,
    ejeCalculado: getEjeForCoords(est.longitud, est.latitud) || est.cuenca || 'Pita'
  }));

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
  if (selectVariable) selectVariable.addEventListener('change', applyFilters);
  if (selectFrecuencia) selectFrecuencia.addEventListener('change', applyFilters);
  if (inputCodigo) inputCodigo.addEventListener('input', applyFilters);
  if (inputNombre) inputNombre.addEventListener('input', applyFilters);
  if (selectTipo) selectTipo.addEventListener('change', () => {
    activeFloatingTipo = 'ALL';
    legendItems.forEach(i => i.style.opacity = '1');
    applyFilters();
  });

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

  // Botón Limpiar
  if (btnLimpiar) {
    btnLimpiar.addEventListener('click', () => {
      if (inputFechaInicio) inputFechaInicio.value = '2026-01-01';
      if (inputFechaFin) inputFechaFin.value = '2026-09-03';
      if (selectVariable) selectVariable.value = 'PRE';
      if (selectFrecuencia) selectFrecuencia.value = 'diario';
      if (inputCodigo) inputCodigo.value = '';
      if (inputNombre) inputNombre.value = '';
      if (selectTipo) selectTipo.value = '';
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

  function openModal(estacion) {
    if (!modal) return;
    currentModalEstacion = estacion;

    const varCode = selectVariable?.value || 'PRE';
    const varCfg = VARIABLES_CONFIG[varCode] || VARIABLES_CONFIG['PRE'];
    const sDate = inputFechaInicio?.value || '2026-01-01';
    const eDate = inputFechaFin?.value || '2026-09-03';
    const freq = selectFrecuencia?.value || 'diario';

    const series = getSeriesDeTiempo(estacion, varCode, sDate, eDate, freq);

    renderModalHeader(estacion, varCfg, sDate, eDate, freq, series);
    renderPeriodoChart(chartCanvas, series, varCfg);
    renderTablePreview(series, varCfg);

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    destroyPeriodoChart();
  }

  function renderModalHeader(estacion, varCfg, sDate, eDate, freq, series) {
    if (!modalHeader) return;
    modalHeader.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="periodo-station-pill ${estacion.tipo === 'Hidrológica' ? 'tipo-hidro' : (estacion.tipo === 'Pluviométrica' ? 'tipo-pluvio' : 'tipo-meteo')}">
            ${estacion.tipo}
          </span>
          <span style="font-size: 13px; font-weight: 700; color: #64748b;">${estacion.codigo}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <button id="btn-modal-periodo-csv" class="btn-card-descargar-periodo" style="padding: 6px 12px; font-size: 12px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exportar CSV
          </button>
          <button id="btn-periodo-close-modal" style="background: transparent; border: none; font-size: 24px; color: #64748b; cursor: pointer;">&times;</button>
        </div>
      </div>
      <h3 style="margin: 0 0 4px; font-size: 20px; font-weight: 800; color: #242857;">${estacion.nombre} (${estacion.codigo})</h3>
      <p style="margin: 0; font-size: 13px; color: #64748b;">
        Variable: <strong>${varCfg.name} (${varCfg.unit})</strong> &middot; Periodo: ${sDate} a ${eDate} &middot; Frecuencia: ${freq}
      </p>
    `;

    modalHeader.querySelector('#btn-periodo-close-modal')?.addEventListener('click', closeModal);
    modalHeader.querySelector('#btn-modal-periodo-csv')?.addEventListener('click', () => {
      exportarSerieCsv(estacion, varCfg.code, series, freq);
    });
  }

  function renderTablePreview(series, varCfg) {
    if (!tablePreviewContainer) return;
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
    const varCfg = VARIABLES_CONFIG[varCode] || VARIABLES_CONFIG['PRE'];

    const sDate = inputFechaInicio?.value || '2026-01-01';
    const eDate = inputFechaFin?.value || '2026-09-03';
    const numStartYear = parseInt(sDate.substring(0, 4), 10);

    // Conteos para leyenda flotante (estaciones con la variable seleccionada, eje activo y activas en el periodo)
    let countMeteo = 0;
    let countPluvio = 0;
    let countHidro = 0;

    allEstaciones.forEach((est) => {
      const anioInicio = parseInt((est.fechaInicio || '').substring(0, 4), 10);
      const matchPeriod = isNaN(anioInicio) || isNaN(numStartYear) || anioInicio <= numStartYear;
      const matchVar = estacionTieneVariable(est, varCode);
      const matchEje = (activeEje === 'ALL') || (est.ejeCalculado && est.ejeCalculado.toUpperCase() === activeEje.toUpperCase());

      if (matchVar && matchEje && matchPeriod) {
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
      const anioInicio = parseInt((est.fechaInicio || '').substring(0, 4), 10);
      const matchPeriod = isNaN(anioInicio) || isNaN(numStartYear) || anioInicio <= numStartYear;
      const matchVar = estacionTieneVariable(est, varCode);
      const matchEje = (activeEje === 'ALL') || (est.ejeCalculado && est.ejeCalculado.toUpperCase() === activeEje.toUpperCase());
      const matchFloatingTipo = (activeFloatingTipo === 'ALL') || (est.tipo === activeFloatingTipo);
      const matchTipo = !qTipo || est.tipo.toLowerCase() === qTipo.toLowerCase();
      const matchCodigo = !qCodigo || est.codigo.toLowerCase().includes(qCodigo);
      const matchNombre = !qNombre || est.nombre.toLowerCase().includes(qNombre);

      return matchVar && matchEje && matchFloatingTipo && matchTipo && matchCodigo && matchNombre && matchPeriod;
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
          <div class="periodo-station-card-top">
            <span class="periodo-station-dot" style="background-color: ${dotColor};"></span>
            <span class="periodo-station-province">${est.provincia}</span>
          </div>
          <div class="periodo-station-code">${est.codigo}</div>
          <div style="font-size: 13px; color: #475569; font-weight: 500;">${est.nombre}</div>
          <div class="periodo-station-pill ${pillClass}">• ${est.tipo}</div>
          <div class="periodo-station-actions">
            <button class="btn-card-ver-datos-periodo" data-codigo="${est.codigo}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
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
      btn.addEventListener('click', () => {
        const codigo = btn.getAttribute('data-codigo');
        const est = allEstaciones.find((e) => e.codigo === codigo);
        if (est) {
          const sDate = inputFechaInicio?.value || '2026-01-01';
          const eDate = inputFechaFin?.value || '2026-09-03';
          const freq = selectFrecuencia?.value || 'diario';
          const series = getSeriesDeTiempo(est, varCode, sDate, eDate, freq);
          exportarSerieCsv(est, varCode, series, freq);
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
