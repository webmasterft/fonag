/**
 * Page Controller: Anuario Hidroclimático
 * Conecta el mapa Leaflet, la lista reactiva de estaciones, los filtros y la tabla estadística.
 */
import { fetchEstaciones } from '../services/estaciones-service.js';
import { getAnuarioEstadistico, getSeriesEstadisticas, exportAnuarioCsv } from '../services/anuario-service.js';
import { initLeafletMap } from '../molecules/map/leaflet-map.js';
import { renderAnuarioTable } from '../molecules/data-table/anuario-table.js';
import { renderEstadisticasCharts, destroyCharts } from '../molecules/charts/anuario-charts.js';
import { initThemeToggle } from '../organisms/theme-toggle.js';

document.addEventListener('DOMContentLoaded', async () => {
  initThemeToggle('#theme-toggle');

  const mapController = initLeafletMap('station-map');
  const cardsContainer = document.getElementById('stations-cards-list');
  const counterEl = document.getElementById('stations-counter');
  const inputCodigo = document.getElementById('input-filter-codigo');
  const inputNombre = document.getElementById('input-filter-nombre');
  const selectTipo = document.getElementById('select-filter-tipo');
  const btnLimpiar = document.getElementById('btn-limpiar-filtros');
  const selectYear = document.getElementById('select-consult-year');
  const btnCompilado = document.getElementById('btn-download-compilado');

  // Modal elements
  const modal = document.getElementById('anuario-data-modal');
  const modalHeader = document.getElementById('anuario-modal-header');
  const modalBody = document.getElementById('anuario-modal-body');

  let allEstaciones = [];
  let currentYear = selectYear ? selectYear.value : '2025';
  let activeCardEl = null;
  let currentModalEstacion = null;
  let currentModalTab = 'charts'; // 'charts' | 'table'

  // 1. Cargar datos de estaciones
  allEstaciones = await fetchEstaciones();

  // 2. Renderizar inicial
  applyFilters();
  if (mapController) {
    setTimeout(() => mapController.invalidateSize(), 150);
  }

  // 3. Listeners de filtros
  if (inputCodigo) inputCodigo.addEventListener('input', applyFilters);
  if (inputNombre) inputNombre.addEventListener('input', applyFilters);
  if (selectTipo) selectTipo.addEventListener('change', applyFilters);

  if (btnLimpiar) {
    btnLimpiar.addEventListener('click', () => {
      if (inputCodigo) inputCodigo.value = '';
      if (inputNombre) inputNombre.value = '';
      if (selectTipo) selectTipo.value = '';
      applyFilters();
    });
  }

  if (selectYear) {
    selectYear.addEventListener('change', (e) => {
      currentYear = e.target.value;
      if (btnCompilado) {
        btnCompilado.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Descargar copilado ${currentYear}
        `;
      }
      if (modal && modal.classList.contains('is-open') && currentModalEstacion) {
        renderModalHeader(currentModalEstacion);
        renderModalContent(currentModalEstacion);
      }
    });
  }

  if (btnCompilado) {
    btnCompilado.addEventListener('click', () => {
      exportarCompilado(allEstaciones, currentYear);
    });
  }

  // Modal backdrop close handlers
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  function openModal(estacion, tab = 'charts') {
    if (!modal || !modalBody) return;
    currentModalEstacion = estacion;
    currentModalTab = tab;

    renderModalHeader(estacion);
    renderModalContent(estacion);

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    destroyCharts();
  }

  function renderModalHeader(estacion) {
    if (!modalHeader) return;

    const normalizedTipo = (estacion.tipo || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const tipoClass = normalizedTipo ? `tipo-${normalizedTipo}` : '';
    const ejeName = estacion.cuenca || estacion.eje || 'Pita';
    const alturaVal = estacion.altura ? `${estacion.altura} m.s.n.m.` : '4111 m.s.n.m.';

    modalHeader.innerHTML = `
      <div class="modal-header-top-row">
        <div class="modal-station-meta-badges">
          <span class="modal-station-type-badge ${tipoClass}">${estacion.tipo || 'Pluviométrica'}</span>
          <span class="modal-station-code">${estacion.codigo}</span>
        </div>
        <div class="modal-header-actions">
          <button type="button" class="btn-modal-excel" id="btn-modal-download-excel">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Descargar Excel
          </button>
          <button type="button" class="btn-modal-close" id="btn-close-modal" aria-label="Cerrar modal">&times;</button>
        </div>
      </div>
      <h3 class="modal-station-title" id="modal-station-title">${estacion.codigo} (${estacion.nombre})</h3>
      <p class="modal-station-subtitle">Eje: ${ejeName} &middot; Altura: ${alturaVal} &middot; A&ntilde;o: ${currentYear}</p>
      
      <div class="modal-nav-tabs">
        <button type="button" class="modal-tab-btn ${currentModalTab === 'charts' ? 'is-active' : ''}" id="tab-btn-charts">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          Gráficas estadísticas
        </button>
        <button type="button" class="modal-tab-btn ${currentModalTab === 'table' ? 'is-active' : ''}" id="tab-btn-table">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/>
          </svg>
          Tabla de datos
        </button>
      </div>
    `;

    // Listeners del header
    const btnExcel = modalHeader.querySelector('#btn-modal-download-excel');
    if (btnExcel) {
      btnExcel.addEventListener('click', () => {
        const rows = getAnuarioEstadistico(estacion, currentYear);
        exportAnuarioCsv(estacion, rows, currentYear);
      });
    }

    const btnClose = modalHeader.querySelector('#btn-close-modal');
    if (btnClose) {
      btnClose.addEventListener('click', closeModal);
    }

    const tabCharts = modalHeader.querySelector('#tab-btn-charts');
    const tabTable = modalHeader.querySelector('#tab-btn-table');

    if (tabCharts) {
      tabCharts.addEventListener('click', () => {
        if (currentModalTab === 'charts') return;
        currentModalTab = 'charts';
        tabCharts.classList.add('is-active');
        if (tabTable) tabTable.classList.remove('is-active');
        renderModalContent(estacion);
      });
    }

    if (tabTable) {
      tabTable.addEventListener('click', () => {
        if (currentModalTab === 'table') return;
        currentModalTab = 'table';
        tabTable.classList.add('is-active');
        if (tabCharts) tabCharts.classList.remove('is-active');
        renderModalContent(estacion);
      });
    }
  }

  function renderModalContent(estacion) {
    if (!modalBody) return;
    if (currentModalTab === 'charts') {
      const series = getSeriesEstadisticas(estacion, currentYear);
      renderEstadisticasCharts(modalBody, series);
    } else {
      destroyCharts();
      const rows = getAnuarioEstadistico(estacion, currentYear);
      renderAnuarioTable(modalBody, estacion, rows, currentYear);
    }
  }

  /**
   * Aplica los filtros a la lista y actualiza el mapa y las cards
   */
  function applyFilters() {
    const qCodigo = (inputCodigo ? inputCodigo.value : '').trim().toLowerCase();
    const qNombre = (inputNombre ? inputNombre.value : '').trim().toLowerCase();
    const qTipo = selectTipo ? selectTipo.value : '';

    const filtered = allEstaciones.filter((est) => {
      const matchCodigo = !qCodigo || est.codigo.toLowerCase().includes(qCodigo);
      const matchNombre = !qNombre || est.nombre.toLowerCase().includes(qNombre);
      const matchTipo = !qTipo || est.tipo.toLowerCase() === qTipo.toLowerCase();
      return matchCodigo && matchNombre && matchTipo;
    });

    // Actualizar contador
    if (counterEl) {
      counterEl.textContent = `${filtered.length} estaciones`;
    }

    // Actualizar marcadores en el mapa
    if (mapController) {
      mapController.setMarkers(filtered, (estacion, openData) => {
        if (openData) {
          openModal(estacion);
        } else {
          highlightCard(estacion.codigo);
        }
      });
    }

    // Renderizar tarjetas
    renderCards(filtered);
  }

  /**
   * Renderiza la columna derecha de tarjetas de estación
   * @param {Array<Object>} list
   */
  function renderCards(list) {
    if (!cardsContainer) return;

    if (list.length === 0) {
      cardsContainer.innerHTML = `
        <div style="padding: 2.5rem 1rem; text-align: center; color: #64748b; font-size: 14px;">
          No se encontraron estaciones para los filtros seleccionados.
        </div>
      `;
      return;
    }

    const html = list.map((est) => `
      <article class="station-card-item" id="card-${est.codigo}" data-codigo="${est.codigo}">
        <div class="station-card-top">
          <span class="station-card-dot"></span>
          <span class="station-card-province">${est.provincia}</span>
        </div>
        <div class="station-card-code">${est.codigo}</div>
        <div style="font-size: 13px; color: #475569; font-weight: 500;">${est.nombre}</div>
        <div class="station-card-pill">• ${est.tipo}</div>
        <div class="station-card-actions">
          <button class="btn-card-ver-estadisticas" data-codigo="${est.codigo}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            Ver estadísticas
          </button>
          <button class="btn-card-descargar" data-codigo="${est.codigo}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Descargar
          </button>
        </div>
      </article>
    `).join('');

    cardsContainer.innerHTML = html;

    // Enlazar eventos de tarjetas
    cardsContainer.querySelectorAll('.station-card-item').forEach((card) => {
      const codigo = card.dataset.codigo;
      const estacion = allEstaciones.find((e) => e.codigo === codigo);
      if (!estacion) return;

      card.addEventListener('click', (e) => {
        // Evitar doble acción si pulsó un botón
        if (e.target.closest('button')) return;
        highlightCard(codigo);
        if (mapController) mapController.focusStation(estacion);
      });

      const btnVer = card.querySelector('.btn-card-ver-estadisticas');
      if (btnVer) {
        btnVer.addEventListener('click', () => openModal(estacion, 'charts'));
      }

      const btnDesc = card.querySelector('.btn-card-descargar');
      if (btnDesc) {
        btnDesc.addEventListener('click', () => {
          const rows = getAnuarioEstadistico(estacion, currentYear);
          exportAnuarioCsv(estacion, rows, currentYear);
        });
      }
    });
  }

  function highlightCard(codigo) {
    if (activeCardEl) activeCardEl.classList.remove('station-card-item-active');
    const target = document.getElementById(`card-${codigo}`);
    if (target) {
      target.classList.add('station-card-item-active');
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      activeCardEl = target;
    }
  }

  function exportarCompilado(stations, year) {
    const headers = ['Codigo', 'Nombre', 'Tipo', 'Provincia', 'Cuenca', 'Latitud', 'Longitud', 'Altura', 'Administrador'];
    const rows = stations.map((s) => [
      `"${s.codigo}"`,
      `"${s.nombre}"`,
      `"${s.tipo}"`,
      `"${s.provincia}"`,
      `"${s.cuenca}"`,
      s.latitud,
      s.longitud,
      `"${s.altura}"`,
      `"${s.administrador}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Compilado_Estaciones_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
});
