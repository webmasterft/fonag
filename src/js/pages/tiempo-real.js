/**
 * Page Controller: Tiempo Real (Telemetría en Vivo)
 * Muestra estaciones con transmisión telemétrica activa,
 * filtros por fecha/hora, código, nombre y tipo de estación,
 * mapa interactivo y modal con conexión directa a la API SEDC en vivo.
 */
import { fetchEstaciones } from '../services/estaciones-service.js';
import { fetchTelemetriaReal, fetchEstadoTransmision } from '../services/telemetria-service.js';
import { exportarSerieCsv } from '../services/periodo-service.js';
import { showApiError, apiErrorHtml } from '../atoms/api-error.js';
import { escapeHtml, displayValue } from '../atoms/escape-html.js';
import { initLeafletMap } from '../molecules/map/leaflet-map.js';
import { renderPeriodoChart, destroyPeriodoChart, showPeriodoChartLoader, buildStationChartTitle } from '../molecules/charts/periodo-charts.js';
import { buildTelemetriaFigure } from '../molecules/charts/telemetria-figure.js';
import { initThemeToggle } from '../organisms/theme-toggle.js';
import { initGlobalHttpLoader } from '../atoms/global-loader.js';
import { initCustomDatePickers } from '../molecules/datepicker/custom-datepicker.js';
import { initPortalHeader } from '../organisms/portal-header.js';

/**
 * Today's date in local time (YYYY-MM-DD): default start date of the telemetry query.
 * SEDC /ajax/telemetria/consulta only accepts `inicio` (there is no end date).
 * @returns {string}
 */
function todayLocal() {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${mm}-${dd}`;
}

document.addEventListener('DOMContentLoaded', async () => {
  initPortalHeader();
  initGlobalHttpLoader();
  initThemeToggle();

  // The date is set before the datepicker starts, since it reads the initial value
  const inputFechaInicio = document.getElementById('input-tr-fecha-inicio');
  if (inputFechaInicio) {
    inputFechaInicio.value = todayLocal();
    inputFechaInicio.max = todayLocal();
  }
  initCustomDatePickers();

  let activeEje = 'ALL';

  // DOM Elements
  const btnLimpiar = document.getElementById('btn-tr-limpiar');

  const inputCodigo = document.getElementById('input-tr-codigo');
  const inputNombre = document.getElementById('input-tr-nombre');
  const selectTipo = document.getElementById('select-tr-tipo');
  const selectEje = document.getElementById('select-tr-eje');
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
      syncEjeSelect();
      applyFilters();
    }
  });

  // Estado de transmisión calculado por SEDC (NORMAL / EXPECTANTE / FALLO), en paralelo con las
  // estaciones. Si falla, la tarjeta "Último Dato" queda neutra: no se inventa un estado.
  const estadosTransmisionPromise = fetchEstadoTransmision().catch((err) => {
    console.error('[TiempoReal] Error cargando estado de transmisión:', err);
    return null;
  });
  let estadosTransmision = null;

  // 1. Cargar Estaciones del Servicio (sin respaldo local: si falla se muestra el error)
  let rawEstaciones;
  try {
    rawEstaciones = await fetchEstaciones();
  } catch (err) {
    console.error('[TiempoReal] Error cargando estaciones:', err);
    showApiError(cardsContainer);
    if (counterEl) counterEl.textContent = '-';
    return;
  }
  // The number of variables per station is only known after querying its telemetry
  telemetriaEstaciones = rawEstaciones
    .filter((est) => Boolean(est.transmision))
    .map((est) => ({
      ...est,
      ejeCalculado: est.eje_trabajo
    }));
  populateEjeOptions();

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
  if (inputCodigo) inputCodigo.addEventListener('input', applyFilters);
  if (inputNombre) inputNombre.addEventListener('input', applyFilters);
  if (selectTipo) selectTipo.addEventListener('change', applyFilters);
  // The select and the map polygons share activeEje: changing one updates the other
  if (selectEje) selectEje.addEventListener('change', () => {
    activeEje = selectEje.value || 'ALL';
    if (mapController) mapController.setEje(activeEje);
    applyFilters();
  });

  // Botón Limpiar
  if (btnLimpiar) {
    btnLimpiar.addEventListener('click', () => {
      if (inputFechaInicio) inputFechaInicio.value = todayLocal();
      if (inputCodigo) inputCodigo.value = '';
      if (inputNombre) inputNombre.value = '';
      if (selectTipo) selectTipo.value = '';
      if (selectEje) selectEje.value = '';
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

    const sDate = inputFechaInicio?.value || todayLocal();

    // Mostrar estado de carga en el modal
    if (modalHeader) {
      modalHeader.innerHTML = `
        <div style="padding: 1rem 0; text-align: center;">
          <h3 style="margin: 0; color: #242857;">Cargando datos en vivo de ${displayValue(estacion.nombre || estacion.codigo)}...</h3>
        </div>
      `;
    }
    if (tablePreviewContainer) tablePreviewContainer.innerHTML = '';
    if (chartCanvas?.parentElement) chartCanvas.parentElement.style.display = 'block';
    // Loader de la app en el área del gráfico hasta que termine de dibujarse
    showPeriodoChartLoader(chartCanvas);
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    // Consultar telemetría real desde la API del SEDC
    [currentTelemetryResult, estadosTransmision] = await Promise.all([
      fetchTelemetriaReal(estacion, sDate),
      estadosTransmisionPromise
    ]);

    if (!currentTelemetryResult.hasData || currentTelemetryResult.variables.length === 0) {
      renderModalEmptyState(estacion, currentTelemetryResult, sDate);
      return;
    }

    const firstVar = currentTelemetryResult.variables[0];
    activeVariableId = firstVar ? firstVar.id : null;

    updateModalView();
  }

  function renderModalEmptyState(estacion, telResult, sDate) {
    if (modalHeader) {
      modalHeader.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="periodo-station-pill ${estacion.tipo === 'Hidrológica' ? 'tipo-hidro' : (estacion.tipo === 'Pluviométrica' ? 'tipo-pluvio' : 'tipo-meteo')}">
              ${displayValue(estacion.tipo)}
            </span>
            <span style="font-size: 13px; font-weight: 700; color: #64748b;">${displayValue(estacion.codigo)}</span>
          </div>
          <button id="btn-tr-close-modal" style="background: transparent; border: none; font-size: 24px; color: #64748b; cursor: pointer;">&times;</button>
        </div>
        <h3 style="margin: 0 0 4px; font-size: 20px; font-weight: 800; color: #242857;">${displayValue(estacion.codigo)} - ${displayValue(estacion.nombre)}</h3>
        <p style="margin: 0; font-size: 13px; color: #64748b;">
          Eje: <strong>${displayValue(estacion.ejeCalculado)}</strong> &middot; Desde ${escapeHtml(sDate.replace('T', ' '))}
        </p>
      `;
      modalHeader.querySelector('#btn-tr-close-modal')?.addEventListener('click', closeModal);
    }

    destroyPeriodoChart();
    if (chartCanvas) {
      const parent = chartCanvas.parentElement;
      if (parent) {
        parent.style.display = 'none';
      }
    }

    if (tablePreviewContainer && telResult.apiError) {
      // The API failed: shared error state (not "no records")
      tablePreviewContainer.innerHTML = apiErrorHtml();
    } else if (tablePreviewContainer) {
      const message = telResult.error || 'No hay datos telemétricos disponibles para el período seleccionado.';
      tablePreviewContainer.innerHTML = `
        <div style="padding: 3rem 1.5rem; text-align: center; background: #ffffff; border-radius: 12px; border: 1px dashed #cbd5e1;">
          <svg style="margin: 0 auto 12px; color: #94a3b8;" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h4 style="margin: 0 0 6px; color: #1e293b; font-size: 16px; font-weight: 700;">Sin registros telemétricos</h4>
          <p style="margin: 0; color: #64748b; font-size: 13.5px; max-width: 480px; margin: 0 auto;">${escapeHtml(message)}</p>
        </div>
      `;
    }
  }

  function updateModalView() {
    if (!currentModalEstacion || !currentTelemetryResult) return;

    if (chartCanvas && chartCanvas.parentElement) {
      chartCanvas.parentElement.style.display = 'block';
    }

    const sDate = inputFechaInicio?.value || todayLocal();

    const currentVar = currentTelemetryResult.variables.find((v) => v.id === activeVariableId) || currentTelemetryResult.variables[0];
    const series = currentTelemetryResult.seriesByVar[currentVar.id] || [];

    const varConfig = {
      code: currentVar.code,
      name: currentVar.name,
      unit: currentVar.unit,
      chartType: currentVar.code === 'PRE' ? 'bar' : 'line',
      color: currentVar.color
    };

    // Same Plotly figure as SEDC (data and U S / U i thresholds), with the standard
    // "Eje • Periodo" subtitle (date and time) used by the modal header and the other consultas
    const chartSubtitle = `Eje: ${displayValue(currentModalEstacion.ejeCalculado)} • Periodo: ${buildPeriodText(series, currentTelemetryResult, sDate)}`;
    series.figure = buildTelemetriaFigure(currentVar.id, series.raw, { subtitle: chartSubtitle });

    renderModalHeader(currentModalEstacion, varConfig, sDate, series, currentTelemetryResult);
    renderPeriodoChart(chartCanvas, series, varConfig, undefined, { title: buildStationChartTitle(currentModalEstacion) });
    renderTablePreview(series, varConfig);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    destroyPeriodoChart();
    currentModalEstacion = null;
    currentTelemetryResult = null;
  }

  /**
   * "Periodo: <inicio> - <fin>" with date and time (YYYY-MM-DD HH:MM), same label as the other
   * consultas. Uses the first/last reading of the selected variable; wind readings carry no
   * dates, so it falls back to another variable of the same response, then to the query date.
   */
  function buildPeriodText(series, telResult, sDate) {
    const withDates = [series, ...Object.values(telResult.seriesByVar || {})]
      .find((s) => s.some((p) => p.fecha)) || [];
    const fechas = withDates.map((p) => p.fecha).filter(Boolean);
    const fmt = (f) => String(f).replace('T', ' ').substring(0, 16);
    if (!fechas.length) return `${escapeHtml(sDate)} 00:00`;
    return `${escapeHtml(fmt(fechas[0]))} - ${escapeHtml(fmt(fechas[fechas.length - 1]))}`;
  }

  /**
   * Color of the "Último Dato" card from SEDC's transmission state (same thresholds as its
   * "alarma de transmisión" map): NORMAL → green, EXPECTANTE → yellow, FALLO → red.
   * Unknown/missing state stays neutral.
   */
  function getEstadoTransmisionInfo(estado) {
    const states = {
      NORMAL: { className: 'is-normal', label: 'Normal', title: 'Transmisión normal' },
      EXPECTANTE: { className: 'is-expectante', label: 'Expectante', title: 'Transmisión con retraso' },
      FALLO: { className: 'is-fallo', label: 'Fallo', title: 'Sin transmisión reciente' },
    };
    return states[estado] || { className: '', label: '', title: 'Estado de transmisión no disponible' };
  }

  function renderModalHeader(estacion, varCfg, sDate, series, telResult) {
    if (!modalHeader) return;

    // Botones selectores de variables disponibles recibidas del backend
    const varButtons = telResult.variables.map((v) => {
      const isActive = v.id === activeVariableId;
      return `
        <button
          type="button"
          class="btn-var-selector"
          data-var-id="${escapeHtml(v.id)}"
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
          ${displayValue(v.name)} (${displayValue(v.unit)})
        </button>
      `;
    }).join(' ');

    const normalizedTipo = (estacion.tipo || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    // Only letters reach the class name (tipo comes from the API)
    const tipoClass = normalizedTipo ? `tipo-${normalizedTipo.replace(/[^a-z]/g, '')}` : '';
    const ejeName = displayValue(estacion.ejeCalculado);
    const stationName = displayValue(estacion.nombre || estacion.codigo);
    const unit = escapeHtml(varCfg.unit);
    // Calcular estadísticas de la serie activa (Máximo, Mínimo y Último dato)
    const validValues = series.map((s) => s.valor).filter((v) => typeof v === 'number' && !isNaN(v));
    const maxVal = validValues.length > 0 ? `${Math.max(...validValues)} ${unit}` : '-';
    const minVal = validValues.length > 0 ? `${Math.min(...validValues)} ${unit}` : '-';
    const lastPoint = series.length > 0 ? series[series.length - 1] : null;
    const lastVal = lastPoint ? `${displayValue(lastPoint.valor)} ${unit}` : '-';
    const lastTime = lastPoint ? displayValue(lastPoint.fecha) : '-';
    const periodText = buildPeriodText(series, telResult, sDate);
    const estadoInfo = getEstadoTransmisionInfo(estadosTransmision?.get(estacion.codigo)?.estado);

    modalHeader.innerHTML = `
      <div class="modal-header-top">
        <div class="modal-header-left">
          <div class="modal-title-row">
            <span class="modal-title-dot"></span>
            <h3 class="modal-station-title">Estación ${displayValue(estacion.codigo)} - ${stationName}</h3>
          </div>
          <div class="modal-type-pill ${tipoClass}">
            <span class="pill-dot"></span>
            <span>${displayValue(estacion.tipo)}</span>
          </div>
        </div>
        <button type="button" class="btn-modal-close-x" id="btn-tr-close-modal" aria-label="Cerrar modal">X</button>
      </div>

      <!-- Tarjetas resumidas: Máximo, Mínimo y Último Dato -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin: 10px 0 12px;">
        <div class="tr-last-reading ${estadoInfo.className}" title="${escapeHtml(estadoInfo.title)}">
          <div class="tr-last-reading-label">Último Dato${estadoInfo.label ? ` <span class="tr-last-reading-state">${escapeHtml(estadoInfo.label)}</span>` : ''}</div>
          <div style="font-size: 15px; font-weight: 800; color: #242857; margin-top: 2px;">${lastVal}</div>
          <div style="font-size: 10.5px; color: #94a3b8; margin-top: 1px;">${lastTime}</div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px;">
          <div style="font-size: 11px; font-weight: 700; color: #ef4444; text-transform: uppercase;">Valor Máximo</div>
          <div style="font-size: 15px; font-weight: 800; color: #1e293b; margin-top: 2px;">${maxVal}</div>
          <div style="font-size: 10.5px; color: #94a3b8; margin-top: 1px;">En el periodo seleccionado</div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px;">
          <div style="font-size: 11px; font-weight: 700; color: #3b82f6; text-transform: uppercase;">Valor Mínimo</div>
          <div style="font-size: 15px; font-weight: 800; color: #1e293b; margin-top: 2px;">${minVal}</div>
          <div style="font-size: 10.5px; color: #94a3b8; margin-top: 1px;">En el periodo seleccionado</div>
        </div>
      </div>

      <div class="modal-header-bottom">
        <p class="modal-meta-info">Eje: ${ejeName} &bull; Periodo: ${periodText}</p>
        <button type="button" class="btn-modal-download-navy" id="btn-modal-tr-csv"${series.length ? '' : ' hidden'}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Descargar datos
        </button>
      </div>
      ${telResult.variables.length > 1 ? `
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 6px;">
          <span style="font-size: 12px; font-weight: 700; color: #475569;">Variables disponibles:</span>
          ${varButtons}
        </div>
      ` : ''}
    `;

    modalHeader.querySelector('#btn-tr-close-modal')?.addEventListener('click', closeModal);
    modalHeader.querySelector('#btn-modal-tr-csv')?.addEventListener('click', () => {
      // CSV of the variable currently selected, built from the telemetry already received
      // from SEDC (there is no official export). The variable object is passed as-is because
      // telemetry variables are not in the periodo catalog.
      exportarSerieCsv(estacion, varCfg, series, 'tiempo-real', 'Telemetría en tiempo real');
    });

    modalHeader.querySelectorAll('.btn-var-selector').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeVariableId = btn.getAttribute('data-var-id');
        updateModalView();
      });
    });
  }

  function renderTablePreview(series, varCfg) {
    if (!tablePreviewContainer) return;
    const preview = series.slice(0, 15);

    tablePreviewContainer.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: #242857;">
          Datos en tiempo real (mostrando ${preview.length} de ${series.length} registros)
        </h4>
        <span style="font-size: 11.5px; color: #64748b;">
          Variable: <strong>${displayValue(varCfg.name)}</strong>
        </span>
      </div>
      <div style="overflow-x: auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <th style="padding: 8px 12px; color: #475569; font-weight: 700;">Fecha / Hora</th>
              <th style="padding: 8px 12px; color: #475569; font-weight: 700;">${displayValue(varCfg.name)} (${displayValue(varCfg.unit)})</th>
            </tr>
          </thead>
          <tbody>
            ${preview.map((p) => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 12px; color: #1e293b; font-weight: 500;">${displayValue(p.fecha)}</td>
                <td style="padding: 8px 12px; color: #1e293b; font-weight: 700;">${displayValue(p.valor)}</td>
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
  /** Eje options from the transmitting stations listed here (stations without one only show under "Todos"). */
  function populateEjeOptions() {
    if (!selectEje) return;
    const ejes = Array.from(new Set(telemetriaEstaciones.map((e) => e.ejeCalculado).filter(Boolean))).sort();
    selectEje.innerHTML = '<option value="">Todos los ejes</option>' +
      ejes.map((eje) => `<option value="${escapeHtml(eje)}">${escapeHtml(eje)}</option>`).join('');
    syncEjeSelect();
  }

  /** Reflects activeEje (map click) in the select; matching is case-insensitive like the filter. */
  function syncEjeSelect() {
    if (!selectEje) return;
    const match = Array.from(selectEje.options).find(
      (o) => o.value && activeEje !== 'ALL' && o.value.toUpperCase() === activeEje.toUpperCase()
    );
    if (match || activeEje === 'ALL') {
      selectEje.value = match ? match.value : '';
      return;
    }
    // Map eje with no stations listed: show it anyway so the select never says "Todos" while filtering
    const option = document.createElement('option');
    option.value = activeEje;
    option.textContent = activeEje;
    selectEje.add(option);
    selectEje.value = activeEje;
  }

  function applyFilters() {
    const qCodigo = (inputCodigo ? inputCodigo.value : '').trim().toLowerCase();
    const qNombre = (inputNombre ? inputNombre.value : '').trim().toLowerCase();
    const qTipo = selectTipo ? selectTipo.value : '';

    const sDate = inputFechaInicio?.value || todayLocal();

    // Filtrar lista de estaciones telemétricas
    const filtered = telemetriaEstaciones.filter((est) => {
      const matchPeriod = !est.fechaInicio || est.fechaInicio <= sDate;
      const matchEje = (activeEje === 'ALL') || (est.ejeCalculado && est.ejeCalculado.toUpperCase() === activeEje.toUpperCase());
      const matchTipo = !qTipo || est.tipo.toLowerCase() === qTipo.toLowerCase();
      const matchCodigo = !qCodigo || est.codigo.toLowerCase().includes(qCodigo);
      const matchNombre = !qNombre || est.nombre.toLowerCase().includes(qNombre);

      return matchEje && matchTipo && matchCodigo && matchNombre && matchPeriod;
    });

    // Actualizar texto contador
    if (counterEl) {
      counterEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'estación' : 'estaciones'} con telemetría`;
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
        <article class="tiempo-real-station-card" id="card-${escapeHtml(est.codigo)}" data-codigo="${escapeHtml(est.codigo)}">
          <div class="tiempo-real-card-header">
            <span class="tiempo-real-station-dot"></span>
            <div class="tiempo-real-station-info">
              <span class="tiempo-real-station-name">${displayValue(est.nombre)}</span>
              <span class="tiempo-real-station-code">${displayValue(est.codigo)}</span>
              <span class="tiempo-real-station-meta">${displayValue(est.ejeCalculado)}</span>
            </div>
          </div>
          <div class="tiempo-real-station-actions">
            <button class="btn-card-ver-datos-tr" data-codigo="${escapeHtml(est.codigo)}">
              <span class="icon-sprite icon-sprite-stats icon-white" aria-hidden="true"></span>
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
      if (window.innerWidth > 1024) {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }
});
