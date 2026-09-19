/**
 * Page Controller: Tiempo Real (Telemetría en Vivo)
 * Muestra estaciones con transmisión telemétrica activa,
 * filtros por fecha/hora, código, nombre y tipo de estación,
 * mapa interactivo y modal con conexión directa a la API SEDC en vivo.
 */
import { fetchEstaciones } from '../services/estaciones-service.js';
import { fetchTelemetriaReal } from '../services/telemetria-service.js';
import { exportarSerieCsv } from '../services/periodo-service.js';
import { initLeafletMap, getEjeForCoords } from '../molecules/map/leaflet-map.js';
import { renderPeriodoChart, destroyPeriodoChart } from '../molecules/charts/periodo-charts.js';
import { initThemeToggle } from '../organisms/theme-toggle.js';
import { initGlobalHttpLoader } from '../atoms/global-loader.js';

document.addEventListener('DOMContentLoaded', async () => {
  initGlobalHttpLoader();
  initThemeToggle();

  let activeEje = 'ALL';

  // DOM Elements
  const inputFechaInicio = document.getElementById('input-tr-fecha-inicio');
  const inputFechaFin = document.getElementById('input-tr-fecha-fin');
  const btnLimpiar = document.getElementById('btn-tr-limpiar');

  const inputCodigo = document.getElementById('input-tr-codigo');
  const inputNombre = document.getElementById('input-tr-nombre');
  const selectTipo = document.getElementById('select-tr-tipo');
  const counterEl = document.getElementById('tr-stations-counter');

  const cardsContainer = document.getElementById('tr-cards-list');

  // Modal Elements
  const modal = document.getElementById('tr-modal');
  const modalHeader = document.getElementById('tr-modal-header');
  const chartCanvas = document.getElementById('tr-chart-canvas');
  const tablePreviewContainer = document.getElementById('tr-table-preview-container');

  let telemetriaEstaciones = [];
  let currentModalEstacion = null;
  let currentTelemetryResult = null;
  let activeVariableId = null;

  // Inicializar Leaflet Map
  const mapController = initLeafletMap('tiempo-real-stations-map', {
    onEjeSelect: (eje) => {
      activeEje = eje;
      applyFilters();
    }
  });

  // 1. Cargar Estaciones del Servicio (API en vivo con fallback)
  const rawEstaciones = await fetchEstaciones();
  telemetriaEstaciones = rawEstaciones
    .filter((est) => Boolean(est.transmision))
    .map((est) => {
      const ejeCalc = getEjeForCoords(est.longitud, est.latitud) || est.cuenca || 'Pita';
      
      let varCount = 1;
      if (est.tipo?.includes('Meteorológica')) varCount = 6;
      else if (est.tipo?.includes('Hidrológica')) varCount = 3;

      return {
        ...est,
        ejeCalculado: ejeCalc,
        varCount
      };
    });

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
  if (inputCodigo) inputCodigo.addEventListener('input', applyFilters);
  if (inputNombre) inputNombre.addEventListener('input', applyFilters);
  if (selectTipo) selectTipo.addEventListener('change', applyFilters);

  // Botón Limpiar
  if (btnLimpiar) {
    btnLimpiar.addEventListener('click', () => {
      if (inputFechaInicio) inputFechaInicio.value = '2026-09-01';
      if (inputFechaFin) inputFechaFin.value = '2026-09-03';
      if (inputCodigo) inputCodigo.value = '';
      if (inputNombre) inputNombre.value = '';
      if (selectTipo) selectTipo.value = '';
      activeEje = 'ALL';
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

    const sDate = inputFechaInicio?.value || '2026-09-01';
    const eDate = inputFechaFin?.value || '2026-09-03';

    // Mostrar estado de carga en el modal
    if (modalHeader) {
      modalHeader.innerHTML = `
        <div style="padding: 1rem 0; text-align: center;">
          <h3 style="margin: 0; color: #242857;">Cargando datos en vivo de ${estacion.nombre}...</h3>
        </div>
      `;
    }
    if (tablePreviewContainer) {
      tablePreviewContainer.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: #64748b;">
          Conectando con la API del SEDC FONAG...
        </div>
      `;
    }
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    // Consultar telemetría real desde la API del SEDC
    currentTelemetryResult = await fetchTelemetriaReal(estacion, sDate, eDate);

    const firstVar = currentTelemetryResult.variables[0];
    activeVariableId = firstVar ? firstVar.id : '1';

    updateModalView();
  }

  function updateModalView() {
    if (!currentModalEstacion || !currentTelemetryResult) return;

    const sDate = inputFechaInicio?.value || '2026-09-01';
    const eDate = inputFechaFin?.value || '2026-09-03';

    const currentVar = currentTelemetryResult.variables.find((v) => v.id === activeVariableId) || currentTelemetryResult.variables[0];
    const series = currentTelemetryResult.seriesByVar[currentVar.id] || [];

    const varConfig = {
      name: currentVar.name,
      unit: currentVar.unit,
      chartType: currentVar.code === 'PRE' ? 'bar' : 'line',
      color: currentVar.color
    };

    renderModalHeader(currentModalEstacion, varConfig, sDate, eDate, series, currentTelemetryResult);
    renderPeriodoChart(chartCanvas, series, varConfig);
    renderTablePreview(series, varConfig, currentTelemetryResult.fromLiveApi);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    destroyPeriodoChart();
    currentModalEstacion = null;
    currentTelemetryResult = null;
  }

  function renderModalHeader(estacion, varCfg, sDate, eDate, series, telResult) {
    if (!modalHeader) return;

    const sourceBadge = telResult.fromLiveApi
      ? `<span style="display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: #10b981; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 9999px;">
           <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>
           API SEDC EN VIVO
         </span>`
      : `<span style="font-size: 11px; font-weight: 700; color: #f59e0b; background: #fffbeb; border: 1px solid #fde68a; padding: 2px 8px; border-radius: 9999px;">
           MODO SIMULADO
         </span>`;

    // Botones selectores de variables disponibles recibidas del backend
    const varButtons = telResult.variables.map((v) => {
      const isActive = v.id === activeVariableId;
      return `
        <button
          type="button"
          class="btn-var-selector"
          data-var-id="${v.id}"
          style="
            background: ${isActive ? '#242857' : '#ffffff'};
            color: ${isActive ? '#ffffff' : '#334155'};
            border: 1px solid ${isActive ? '#242857' : '#cbd5e1'};
            border-radius: 6px;
            padding: 4px 10px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
          "
        >
          ${v.name} (${v.unit || 'n/a'}) [${v.count}]
        </button>
      `;
    }).join(' ');

    modalHeader.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <span class="periodo-station-pill ${estacion.tipo === 'Hidrológica' ? 'tipo-hidro' : (estacion.tipo === 'Pluviométrica' ? 'tipo-pluvio' : 'tipo-meteo')}">
            ${estacion.tipo}
          </span>
          ${sourceBadge}
          <span style="font-size: 13px; font-weight: 700; color: #64748b;">${estacion.codigo}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <button id="btn-modal-tr-csv" class="btn-card-descargar-periodo" style="padding: 6px 12px; font-size: 12px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exportar CSV
          </button>
          <button id="btn-tr-close-modal" style="background: transparent; border: none; font-size: 24px; color: #64748b; cursor: pointer;">&times;</button>
        </div>
      </div>
      <h3 style="margin: 0 0 4px; font-size: 20px; font-weight: 800; color: #242857;">${estacion.nombre} (${estacion.codigo})</h3>
      <p style="margin: 0 0 10px; font-size: 13px; color: #64748b;">
        Eje: <strong>${estacion.ejeCalculado}</strong> &middot; Periodo: ${sDate} a ${eDate} &middot; Frecuencia: Subhoraria / Horaria
      </p>
      ${telResult.variables.length > 1 ? `
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 6px;">
          <span style="font-size: 12px; font-weight: 700; color: #475569;">Variables disponibles:</span>
          ${varButtons}
        </div>
      ` : ''}
    `;

    modalHeader.querySelector('#btn-tr-close-modal')?.addEventListener('click', closeModal);
    modalHeader.querySelector('#btn-modal-tr-csv')?.addEventListener('click', () => {
      exportarSerieCsv(estacion, varCfg.code || 'PRE', series, 'tiempo-real');
    });

    modalHeader.querySelectorAll('.btn-var-selector').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeVariableId = btn.getAttribute('data-var-id');
        updateModalView();
      });
    });
  }

  function renderTablePreview(series, varCfg, isLive) {
    if (!tablePreviewContainer) return;
    const preview = series.slice(0, 15);

    tablePreviewContainer.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: #242857;">
          Datos en tiempo real (mostrando ${preview.length} de ${series.length} registros)
        </h4>
        <span style="font-size: 11.5px; color: #64748b;">
          Variable: <strong>${varCfg.name}</strong>
        </span>
      </div>
      <div style="overflow-x: auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <th style="padding: 8px 12px; color: #475569; font-weight: 700;">Fecha / Hora</th>
              <th style="padding: 8px 12px; color: #475569; font-weight: 700;">${varCfg.name} (${varCfg.unit})</th>
              <th style="padding: 8px 12px; color: #475569; font-weight: 700;">Estado / Transmisión</th>
            </tr>
          </thead>
          <tbody>
            ${preview.map((p) => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 12px; color: #1e293b; font-weight: 500;">${p.fecha}</td>
                <td style="padding: 8px 12px; color: #1e293b; font-weight: 700;">${p.valor}</td>
                <td style="padding: 8px 12px; color: #10b981; font-weight: 600;">
                  ${isLive ? 'Dato Crudo (Telemetría SEDC)' : 'Simulado (Offline)'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Aplica los filtros reactivos y actualiza mapa y tarjetas
   */
  function applyFilters() {
    const qCodigo = (inputCodigo ? inputCodigo.value : '').trim().toLowerCase();
    const qNombre = (inputNombre ? inputNombre.value : '').trim().toLowerCase();
    const qTipo = selectTipo ? selectTipo.value : '';

    const eDate = inputFechaFin?.value || '2026-09-03';

    // Filtrar lista de estaciones telemétricas
    const filtered = telemetriaEstaciones.filter((est) => {
      const matchPeriod = !est.fechaInicio || est.fechaInicio === 'N/D' || est.fechaInicio <= eDate;
      const matchEje = (activeEje === 'ALL') || (est.ejeCalculado && est.ejeCalculado.toUpperCase() === activeEje.toUpperCase());
      const matchTipo = !qTipo || est.tipo.toLowerCase() === qTipo.toLowerCase();
      const matchCodigo = !qCodigo || est.codigo.toLowerCase().includes(qCodigo);
      const matchNombre = !qNombre || est.nombre.toLowerCase().includes(qNombre);

      return matchEje && matchTipo && matchCodigo && matchNombre && matchPeriod;
    });

    // Actualizar texto contador
    if (counterEl) {
      counterEl.textContent = `${filtered.length} estaciones con precipitación`;
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
        subtitle: 'Tiempo Real',
        buttonText: 'Ver datos en vivo'
      });
    }

    // Renderizar tarjetas
    renderCards(filtered);
  }

  function renderCards(list) {
    if (!cardsContainer) return;

    if (list.length === 0) {
      cardsContainer.innerHTML = `
        <div style="padding: 2.5rem 1rem; text-align: center; color: #64748b; font-size: 14px;">
          No se encontraron estaciones telemétricas con los filtros seleccionados.
        </div>
      `;
      return;
    }

    cardsContainer.innerHTML = list.map((est) => {
      return `
        <article class="tiempo-real-station-card" id="card-${est.codigo}" data-codigo="${est.codigo}">
          <div class="tiempo-real-card-header">
            <span class="tiempo-real-station-dot"></span>
            <div class="tiempo-real-station-info">
              <span class="tiempo-real-station-name">${est.nombre}</span>
              <span class="tiempo-real-station-code">${est.codigo}</span>
              <span class="tiempo-real-station-meta">${est.ejeCalculado} &bull; ${est.varCount} var.</span>
            </div>
          </div>
          <div class="tiempo-real-station-actions">
            <button class="btn-card-ver-datos-tr" data-codigo="${est.codigo}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 3v18h18"/>
                <path d="M18 17V9"/>
                <path d="M13 17V5"/>
                <path d="M8 17v-3"/>
                <circle cx="8" cy="14" r="1" fill="currentColor"/>
                <circle cx="13" cy="5" r="1" fill="currentColor"/>
                <circle cx="18" cy="9" r="1" fill="currentColor"/>
                <path d="M8 14l5-9 5 4" stroke-dasharray="1 1"/>
              </svg>
              Ver datos
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Listeners de botones de las tarjetas
    cardsContainer.querySelectorAll('.btn-card-ver-datos-tr').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const codigo = btn.getAttribute('data-codigo');
        const est = telemetriaEstaciones.find((e) => e.codigo === codigo);
        if (est) openModal(est);
      });
    });

    cardsContainer.querySelectorAll('.tiempo-real-station-card').forEach((card) => {
      card.addEventListener('click', () => {
        const codigo = card.getAttribute('data-codigo');
        const est = telemetriaEstaciones.find((e) => e.codigo === codigo);
        if (est && mapController) {
          mapController.focusStation(est);
          highlightCard(codigo);
        }
      });
    });
  }

  function highlightCard(codigo) {
    cardsContainer?.querySelectorAll('.tiempo-real-station-card').forEach((c) => {
      c.classList.remove('is-active');
    });
    const target = document.getElementById(`card-${codigo}`);
    if (target) {
      target.classList.add('is-active');
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
});
