/**
 * Page Controller: Anuario Hidroclimático
 * Conecta el mapa Leaflet, la lista reactiva de estaciones, los filtros y la tabla estadística.
 */
import { fetchEstaciones } from '../services/estaciones-service.js';
import {
  fetchAnuarioSedc,
  downloadAnuarioExcel
} from '../services/anuario-service.js';
import { showApiError } from '../atoms/api-error.js';
import { initLeafletMap } from '../molecules/map/leaflet-map.js';
import { renderAnuarioSedc, destroyAnuarioSedc } from '../molecules/charts/anuario-sedc.js';
import { initThemeToggle } from '../organisms/theme-toggle.js';
import { initGlobalHttpLoader, showInlineLoader } from '../atoms/global-loader.js';

document.addEventListener('DOMContentLoaded', async () => {
  initGlobalHttpLoader();
  initThemeToggle();

  let activeEje = 'ALL';
  let activeFloatingTipo = 'ALL';

  const mapController = initLeafletMap('station-map', {
    onEjeSelect: (eje) => {
      activeEje = eje;
      applyFilters();
    }
  });

  const cardsContainer = document.getElementById('stations-cards-list');
  const counterEl = document.getElementById('stations-counter');
  const inputCodigo = document.getElementById('input-filter-codigo');
  const inputNombre = document.getElementById('input-filter-nombre');
  const selectTipo = document.getElementById('select-filter-tipo');
  const btnLimpiar = document.getElementById('btn-limpiar-filtros');
  const selectYear = document.getElementById('select-consult-year');
  const btnCompilado = document.getElementById('btn-download-compilado');

  // Elementos de la leyenda flotante "TIPO DE ESTACIÓN"
  const countMeteoEl = document.getElementById('anuario-count-meteo');
  const countPluvioEl = document.getElementById('anuario-count-pluvio');
  const countHidroEl = document.getElementById('anuario-count-hidro');
  const legendItems = document.querySelectorAll('#anuario-map-tipo-legend .tipo-legend-item');

  // Modal elements
  const modal = document.getElementById('anuario-data-modal');
  const modalHeader = document.getElementById('anuario-modal-header');
  const modalBody = document.getElementById('anuario-modal-body');

  let allEstaciones = [];
  let currentYear = selectYear ? selectYear.value : '2025';
  let activeCardEl = null;
  let currentModalEstacion = null;
  let currentModalTab = 'charts'; // 'charts' | 'table'

  // Leer parámetro URL opcional ?eje=... o ?codigo=...
  const urlParams = new URLSearchParams(window.location.search);
  const paramEje = urlParams.get('eje');
  const paramCodigo = urlParams.get('codigo');
  if (paramEje) {
    activeEje = paramEje;
    if (mapController) mapController.setEje(paramEje);
  }
  if (paramCodigo && inputCodigo) {
    inputCodigo.value = paramCodigo;
  }

  // 1. Cargar datos de estaciones (sin respaldo local: si falla se muestra el error)
  let rawEstaciones;
  try {
    rawEstaciones = await fetchEstaciones();
  } catch (err) {
    console.error('[Anuario] Error cargando estaciones:', err);
    showApiError(cardsContainer);
    if (counterEl) counterEl.textContent = '';
    return;
  }
  allEstaciones = rawEstaciones.map((est) => ({
    ...est,
    ejeCalculado: est.eje_trabajo
  }));

  // 2. Renderizar inicial
  applyFilters();
  if (mapController) {
    setTimeout(() => mapController.invalidateSize(), 150);
  }

  // 3. Listeners de filtros
  if (inputCodigo) inputCodigo.addEventListener('input', applyFilters);
  if (inputNombre) inputNombre.addEventListener('input', applyFilters);
  if (selectTipo) selectTipo.addEventListener('change', () => {
    activeFloatingTipo = 'ALL';
    legendItems.forEach(i => i.style.opacity = '1');
    applyFilters();
  });

  // Listeners de la leyenda flotante de tipo
  legendItems.forEach(item => {
    item.addEventListener('click', () => {
      const type = item.getAttribute('data-type');
      if (activeFloatingTipo === type) {
        activeFloatingTipo = 'ALL';
        legendItems.forEach(i => i.style.opacity = '1');
      } else {
        activeFloatingTipo = type;
        legendItems.forEach(i => {
          i.style.opacity = (i.getAttribute('data-type') === type) ? '1' : '0.4';
        });
      }
      applyFilters();
    });
  });

  if (btnLimpiar) {
    btnLimpiar.addEventListener('click', () => {
      if (inputCodigo) inputCodigo.value = '';
      if (inputNombre) inputNombre.value = '';
      if (selectTipo) selectTipo.value = '';
      activeEje = 'ALL';
      activeFloatingTipo = 'ALL';
      legendItems.forEach(i => i.style.opacity = '1');
      if (mapController) mapController.setEje('ALL');
      applyFilters();
    });
  }

  if (selectYear) {
    const noticeEl = document.querySelector('.year-notice-text');
    const cardsOverlay = document.getElementById('cards-loading-overlay');
    const cardsOverlayText = document.getElementById('cards-loading-text');
    const mapOverlay = document.getElementById('map-loading-overlay');
    const mapOverlayText = document.getElementById('map-loading-text');

    const updateNotice = () => {
      if (!noticeEl) return;
      noticeEl.style.display = currentYear === '2026' ? 'block' : 'none';
    };
    updateNotice();

    selectYear.addEventListener('change', async (e) => {
      currentYear = e.target.value;
      updateNotice();

      // 1. Mostrar estado de carga en tarjetas, mapa y modal
      selectYear.disabled = true;
      if (btnCompilado) btnCompilado.disabled = true;

      if (cardsOverlay) {
        if (cardsOverlayText) {
          cardsOverlayText.textContent = `Cargando datos del año ${currentYear}...`;
        }
        cardsOverlay.style.display = 'flex';
        cardsOverlay.setAttribute('aria-busy', 'true');
      }

      if (mapOverlay) {
        if (mapOverlayText) {
          mapOverlayText.textContent = `Actualizando mapa ${currentYear}...`;
        }
        mapOverlay.style.display = 'flex';
        mapOverlay.setAttribute('aria-busy', 'true');
      }

      const isModalOpen = modal && modal.classList.contains('is-open') && currentModalEstacion;
      if (isModalOpen) {
        renderModalHeader(currentModalEstacion);
        if (modalBody) {
          modalBody.innerHTML = `
            <div class="modal-loading-state">
              <div class="fonag-loader-card">
              <div class="fonag-loader-spinner-wrapper">
                <div class="fonag-loader-ring"></div>
                <div class="fonag-loader-inner-dot"></div>
              </div>
              <div class="fonag-loader-text-group">
                <span class="fonag-loader-title">Consultando servidor...</span>
                <span class="fonag-loader-subtitle">Cargando estadísticas del año ${currentYear}...</span>
              </div>
            </div>
            </div>
          `;
        }
      }

      // 3. Actualizar componentes con el nuevo año
      if (btnCompilado) {
        btnCompilado.disabled = false;
        btnCompilado.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Descargar copilado ${currentYear}
        `;
      }

      applyFilters();

      if (isModalOpen) {
        renderModalContent(currentModalEstacion);
      }

      // 4. Ocultar estados de carga
      if (cardsOverlay) {
        cardsOverlay.style.display = 'none';
        cardsOverlay.setAttribute('aria-busy', 'false');
      }
      if (mapOverlay) {
        mapOverlay.style.display = 'none';
        mapOverlay.setAttribute('aria-busy', 'false');
      }
      selectYear.disabled = false;
    });
  }

  if (btnCompilado) {
    btnCompilado.addEventListener('click', () => {
      runDownload(btnCompilado, () => exportarCompilado(allEstaciones, currentYear));
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
    modalRenderToken++; // descarta respuestas pendientes
    destroyAnuarioSedc();
  }

  function renderModalHeader(estacion) {
    if (!modalHeader) return;

    const normalizedTipo = (estacion.tipo || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const tipoClass = normalizedTipo ? `tipo-${normalizedTipo}` : 'tipo-hidrologica';
    const ejeName = estacion.cuenca || estacion.eje || 'Pita';
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
        <button type="button" class="btn-modal-close-x" id="btn-close-modal" aria-label="Cerrar modal">X</button>
      </div>

      <div class="modal-header-bottom">
        <p class="modal-meta-info">Eje: ${ejeName} &bull; Altura: ${alturaVal} &bull; Año: ${currentYear}</p>
        <button type="button" class="btn-modal-download-navy" id="btn-modal-download-excel">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Descargar Excel
        </button>
      </div>

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
        runDownload(btnExcel, () => downloadAnuarioExcel([estacion], currentYear));
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

  // Respuesta de /hydro_annual por estación+año: cambiar de pestaña no vuelve a consultar
  const anuarioCache = new Map();
  let modalRenderToken = 0;

  async function renderModalContent(estacion) {
    if (!modalBody) return;
    const token = ++modalRenderToken;
    const year = currentYear;
    const cacheKey = `${estacion.id}|${year}`;

    // Loader de la app centrado en el modal hasta que se dibuje el contenido
    destroyAnuarioSedc();
    modalBody.innerHTML = '';
    modalBody.style.minHeight = '260px';
    const removeLoader = showInlineLoader(modalBody, { subtitle: 'Cargando series del anuario' });
    try {
      if (!anuarioCache.has(cacheKey)) {
        anuarioCache.set(cacheKey, await fetchAnuarioSedc(estacion, year));
      }
      if (token !== modalRenderToken) return; // otra estación/año/pestaña se pidió mientras cargaba

      // "Gráficas estadísticas": solo las figuras de SEDC; "Tabla de datos": solo las tablas
      await renderAnuarioSedc(modalBody, anuarioCache.get(cacheKey), {
        view: currentModalTab === 'table' ? 'table' : 'charts'
      });
    } catch (err) {
      console.error('[Anuario] Error consultando hydro_annual:', err);
      anuarioCache.delete(cacheKey);
      if (token === modalRenderToken) {
        modalBody.innerHTML = '<div class="anuario-sedc-empty">No se pudo consultar el anuario en SEDC. Intenta más tarde.</div>';
      }
    } finally {
      removeLoader();
      if (token === modalRenderToken) modalBody.style.minHeight = '';
    }
  }

  /**
   * Aplica los filtros a la lista y actualiza el mapa y las cards
   */
  function applyFilters() {
    const qCodigo = (inputCodigo ? inputCodigo.value : '').trim().toLowerCase();
    const qNombre = (inputNombre ? inputNombre.value : '').trim().toLowerCase();
    const qTipo = selectTipo ? selectTipo.value : '';
    const numYear = parseInt(currentYear, 10) || 2025;

    // Calcular conteos para la leyenda flotante según el eje activo y año seleccionado
    let countMeteo = 0;
    let countPluvio = 0;
    let countHidro = 0;

    allEstaciones.forEach((est) => {
      const anioInicio = parseInt((est.fechaInicio || '').substring(0, 4), 10);
      const matchYear = isNaN(anioInicio) || anioInicio <= numYear;
      const matchEje = (activeEje === 'ALL') || (est.ejeCalculado && est.ejeCalculado.toUpperCase() === activeEje.toUpperCase());

      if (matchYear && matchEje) {
        if (est.tipo?.includes('Hidro')) {
          countHidro++;
        } else if (est.tipo?.includes('Pluvio')) {
          countPluvio++;
        } else {
          countMeteo++;
        }
      }
    });

    if (countMeteoEl) countMeteoEl.textContent = countMeteo;
    if (countPluvioEl) countPluvioEl.textContent = countPluvio;
    if (countHidroEl) countHidroEl.textContent = countHidro;

    const filtered = allEstaciones.filter((est) => {
      const matchCodigo = !qCodigo || est.codigo.toLowerCase().includes(qCodigo);
      const matchNombre = !qNombre || est.nombre.toLowerCase().includes(qNombre);
      const matchTipo = !qTipo || est.tipo.toLowerCase() === qTipo.toLowerCase();

      // Filtro por eje territorial seleccionado
      const matchEje = (activeEje === 'ALL') || (est.ejeCalculado && est.ejeCalculado.toUpperCase() === activeEje.toUpperCase());

      // Filtro interactivo por leyenda flotante de tipo de estación
      const matchFloatingTipo = (activeFloatingTipo === 'ALL') || (est.tipo === activeFloatingTipo);

      // Filtrar estaciones según año de inicio de operación
      const anioInicio = parseInt((est.fechaInicio || '').substring(0, 4), 10);
      const matchYear = isNaN(anioInicio) || anioInicio <= numYear;

      return matchCodigo && matchNombre && matchTipo && matchEje && matchFloatingTipo && matchYear;
    });

    // Actualizar contador
    if (counterEl) {
      counterEl.textContent = `${filtered.length} estaciones`;
    }

    // Actualizar marcadores en el mapa para el año seleccionado
    if (mapController) {
      mapController.setMarkers(filtered, (estacion, openData) => {
        if (openData) {
          openModal(estacion, 'charts');
        } else {
          highlightCard(estacion.codigo);
        }
      }, currentYear);
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

    const html = list.map((est) => {
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
      <article class="station-card-item" id="card-${est.codigo}" data-codigo="${est.codigo}">
        <div class="station-card-top">
          <span class="station-card-dot" style="background-color: ${dotColor};"></span>
          <span class="station-card-province">${est.provincia}</span>
        </div>
        <div class="station-card-code">${est.codigo}</div>
        <div style="font-size: 13px; color: #475569; font-weight: 500;">${est.nombre}</div>
        <div class="station-card-pill ${pillClass}">• ${est.tipo}</div>
        <div class="station-card-actions">
          <button class="btn-card-ver-estadisticas" data-codigo="${est.codigo}">
            <span class="icon-sprite icon-sprite-01 icon-white" aria-hidden="true"></span>
            Ver estadísticas
          </button>
          <button class="btn-card-descargar" data-codigo="${est.codigo}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Descargar Excel
          </button>
        </div>
      </article>
      `;
    }).join('');

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
          runDownload(btnDesc, () => downloadAnuarioExcel([estacion], currentYear));
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

  // Compilado oficial de SEDC: un solo Excel con el anuario de todas las estaciones
  function exportarCompilado(stations, year) {
    return downloadAnuarioExcel(stations, year);
  }

  /**
   * Deshabilita el botón mientras se descarga el Excel de SEDC y avisa si falla.
   */
  async function runDownload(button, task) {
    if (button.disabled) return;
    button.disabled = true;
    const original = button.innerHTML;
    button.innerHTML = 'Descargando...';
    try {
      await task();
    } catch (err) {
      console.error('[Anuario] Error descargando Excel:', err);
      alert('No se pudo descargar el anuario desde SEDC. Intenta más tarde.');
    } finally {
      button.disabled = false;
      button.innerHTML = original;
    }
  }

});
