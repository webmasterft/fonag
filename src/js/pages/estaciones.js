/**
 * Page Controller: Estaciones Directory
 * Conecta la tabla de datos de estaciones, búsqueda, filtros por tipo, provincia y eje de trabajo,
 * ordenamiento de columnas, paginación y exportación CSV.
 */
import { fetchEstaciones } from '../services/estaciones-service.js';
import { initThemeToggle } from '../organisms/theme-toggle.js';
import { initGlobalHttpLoader } from '../atoms/global-loader.js';
import ejesGeojsonData from '../../data/ejes_2026.json';

// Helper geométrico para asociar estaciones al Eje de Trabajo exacto
function pointInPoly(x, y, poly) {
  let inside = false;
  let p1x = poly[0][0];
  let p1y = poly[0][1];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const p2x = poly[(i + 1) % n][0];
    const p2y = poly[(i + 1) % n][1];
    if (y > Math.min(p1y, p2y)) {
      if (y <= Math.max(p1y, p2y)) {
        if (x <= Math.max(p1x, p2x)) {
          let xinters = 0;
          if (p1y !== p2y) {
            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x;
          }
          if (p1x === p2x || x <= xinters) {
            inside = !inside;
          }
        }
      }
    }
    p1x = p2x;
    p1y = p2y;
  }
  return inside;
}

function getEjeForCoords(lng, lat) {
  if (!ejesGeojsonData || !Array.isArray(ejesGeojsonData.features)) return 'Pita';

  for (const f of ejesGeojsonData.features) {
    const geom = f.geometry;
    if (!geom) continue;
    const name = f.properties?.eje_trab || '';

    if (geom.type === 'Polygon') {
      if (pointInPoly(lng, lat, geom.coordinates[0])) return formatEjeName(name);
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        if (pointInPoly(lng, lat, poly[0])) return formatEjeName(name);
      }
    }
  }
  return null;
}

function formatEjeName(name) {
  if (!name) return 'Pita';
  const u = name.toUpperCase();
  if (u.includes('PITA')) return 'Pita';
  if (u.includes('PICHINCHA')) return 'Pichincha Atacazo';
  if (u.includes('NORORIENTE')) return 'Nororiente DMQ';
  if (u.includes('ANTISANA')) return 'Antisana';
  if (u.includes('PAPALLACTA')) return 'Papallacta - Oyacachi';
  if (u.includes('SAN PEDRO')) return 'San Pedro';
  if (u.includes('PISQUE')) return 'Pisque';
  if (u.includes('NOROCCIDENTE')) return 'Noroccidente';
  if (u.includes('NORCENTRAL')) return 'Norcentral';
  return name;
}

document.addEventListener('DOMContentLoaded', async () => {
  initGlobalHttpLoader();
  initThemeToggle();

  // Elementos DOM
  const tableLoaderEl = document.getElementById('estaciones-table-loader');
  const tableBody = document.getElementById('estaciones-table-body');
  const counterFoundEl = document.getElementById('estaciones-found-count');
  const counterTotalEl = document.getElementById('estaciones-total-count');
  const inputCodigo = document.getElementById('filter-codigo');
  const inputNombre = document.getElementById('filter-nombre');
  const selectTipo = document.getElementById('filter-tipo');
  const selectProvincia = document.getElementById('filter-provincia');
  const selectEje = document.getElementById('filter-eje');
  const selectPageSize = document.getElementById('select-page-size');
  const paginationRangeEl = document.getElementById('pagination-range-text');
  const pageNumbersContainer = document.getElementById('page-numbers-container');
  const btnPrevPage = document.getElementById('btn-prev-page');
  const btnNextPage = document.getElementById('btn-next-page');
  const btnDescargar = document.getElementById('btn-descargar-estaciones');
  const statPills = document.querySelectorAll('.estaciones-stat-pill');

  let allEstaciones = [];
  let currentPage = 1;
  let pageSize = 10;
  let sortColumn = null;
  let sortDirection = 'asc'; // 'asc' | 'desc'
  let activePillTipo = 'ALL';

  // 1. Cargar Estaciones del Servicio
  const rawList = await fetchEstaciones();
  allEstaciones = rawList.map((item, idx) => {
    // Resolver eje geométricamente o por sistemacuenca
    let eje = getEjeForCoords(item.longitud, item.latitud);
    if (!eje) {
      const sis = (item.sistema || item.cuenca || '').toLowerCase();
      if (sis.includes('pita')) eje = 'Pita';
      else if (sis.includes('centro') || sis.includes('cinto') || sis.includes('saloya')) eje = 'Pichincha Atacazo';
      else if (sis.includes('mica') || sis.includes('antisana')) eje = 'Antisana';
      else if (sis.includes('papallacta') || sis.includes('oyacachi')) eje = 'Papallacta - Oyacachi';
      else if (sis.includes('noroccidente') || sis.includes('mindo')) eje = 'Noroccidente';
      else eje = 'Pita';
    }

    return {
      no: idx + 1,
      ...item,
      ejeDeTrabajo: eje
    };
  });

  // 2. Leer parámetros de URL si viene filtrado desde Home
  const urlParams = new URLSearchParams(window.location.search);
  const paramEje = urlParams.get('eje');
  const paramTipo = urlParams.get('tipo');
  const paramCodigo = urlParams.get('codigo');

  if (paramEje && selectEje) selectEje.value = paramEje;
  if (paramTipo && selectTipo) selectTipo.value = paramTipo;
  if (paramCodigo && inputCodigo) inputCodigo.value = paramCodigo;

  // 3. Aplicar Filtros y Renderizar
  function applyFiltersAndRender() {
    const qCodigo = (inputCodigo?.value || '').trim().toLowerCase();
    const qNombre = (inputNombre?.value || '').trim().toLowerCase();
    const qTipo = (selectTipo?.value || '');
    const qProvincia = (selectProvincia?.value || '');
    const qEje = (selectEje?.value || '');

    const filtered = allEstaciones.filter(item => {
      const matchCodigo = !qCodigo || item.codigo.toLowerCase().includes(qCodigo);
      const matchNombre = !qNombre || item.nombre.toLowerCase().includes(qNombre);
      const matchTipoSelect = !qTipo || item.tipo === qTipo;
      const matchTipoPill = (activePillTipo === 'ALL') || (item.tipo === activePillTipo);
      const matchProvincia = !qProvincia || item.provincia === qProvincia;
      const matchEje = !qEje || item.ejeDeTrabajo === qEje;

      return matchCodigo && matchNombre && matchTipoSelect && matchTipoPill && matchProvincia && matchEje;
    });

    // Ordenamiento
    if (sortColumn) {
      filtered.sort((a, b) => {
        let valA = a[sortColumn] ?? '';
        let valB = b[sortColumn] ?? '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Contadores
    if (counterFoundEl) counterFoundEl.textContent = `${filtered.length} estaciones encontradas`;
    if (counterTotalEl) counterTotalEl.textContent = `${filtered.length} estaciones activas`;

    // Paginación
    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, filtered.length);
    const pageItems = filtered.slice(startIdx, endIdx);

    // Renderizar Filas de la Tabla
    if (tableBody) {
      if (pageItems.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 2.5rem; color: #64748b;">
              No se encontraron estaciones que coincidan con los criterios de búsqueda.
            </td>
          </tr>
        `;
      } else {
        tableBody.innerHTML = pageItems.map(item => {
          let badgeClass = 'meteo';
          if (item.tipo?.includes('Hidro')) badgeClass = 'hidro';
          else if (item.tipo?.includes('Pluvio')) badgeClass = 'pluvio';

          const transClass = item.transmision ? 'activo' : 'inactivo';
          const transLabel = item.transmision ? 'Activo' : 'Inactivo';

          return `
            <tr>
              <td class="cell-no">${item.no}</td>
              <td class="cell-codigo">
                <a href="/consultas/anuario/?codigo=${item.codigo}" style="color: #1e2347; text-decoration: none; font-weight: 700;">
                  ${item.codigo}
                </a>
              </td>
              <td class="cell-nombre">${item.nombre}</td>
              <td>
                <span class="badge-pill-tipo ${badgeClass}">
                  <span class="dot"></span>
                  ${item.tipo}
                </span>
              </td>
              <td>${item.provincia}</td>
              <td>
                <span class="cell-eje">
                  <span class="eje-mini-dot"></span>
                  ${item.ejeDeTrabajo}
                </span>
              </td>
              <td>
                <span class="status-pill-transmision ${transClass}">
                  <span class="status-dot"></span>
                  ${transLabel}
                </span>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // Renderizar Controles de Paginación
    if (paginationRangeEl) {
      paginationRangeEl.innerHTML = `Mostrando <strong>${filtered.length === 0 ? 0 : startIdx + 1} &ndash; ${endIdx}</strong> de <strong>${filtered.length}</strong> resultados por página:`;
    }

    if (btnPrevPage) btnPrevPage.disabled = (currentPage <= 1);
    if (btnNextPage) btnNextPage.disabled = (currentPage >= totalPages);

    if (pageNumbersContainer) {
      let pagesHtml = '';
      for (let p = 1; p <= totalPages; p++) {
        pagesHtml += `
          <button class="btn-page-number ${p === currentPage ? 'active' : ''}" data-page="${p}">
            ${p}
          </button>
        `;
      }
      pageNumbersContainer.innerHTML = pagesHtml;

      pageNumbersContainer.querySelectorAll('.btn-page-number').forEach(btn => {
        btn.addEventListener('click', () => {
          currentPage = parseInt(btn.getAttribute('data-page'), 10);
          applyFiltersAndRender();
        });
      });
    }
  }

  // Listeners de Filtros
  if (inputCodigo) inputCodigo.addEventListener('input', () => { currentPage = 1; applyFiltersAndRender(); });
  if (inputNombre) inputNombre.addEventListener('input', () => { currentPage = 1; applyFiltersAndRender(); });
  if (selectTipo) selectTipo.addEventListener('change', () => { currentPage = 1; applyFiltersAndRender(); });
  if (selectProvincia) selectProvincia.addEventListener('change', () => { currentPage = 1; applyFiltersAndRender(); });
  if (selectEje) selectEje.addEventListener('change', () => { currentPage = 1; applyFiltersAndRender(); });

  if (selectPageSize) {
    selectPageSize.addEventListener('change', () => {
      pageSize = parseInt(selectPageSize.value, 10) || 10;
      currentPage = 1;
      applyFiltersAndRender();
    });
  }

  if (btnPrevPage) {
    btnPrevPage.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        applyFiltersAndRender();
      }
    });
  }

  if (btnNextPage) {
    btnNextPage.addEventListener('click', () => {
      currentPage++;
      applyFiltersAndRender();
    });
  }

  // Stat Pills (Cabecera Superior)
  statPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const targetTipo = pill.getAttribute('data-tipo');
      if (activePillTipo === targetTipo) {
        activePillTipo = 'ALL';
        statPills.forEach(p => p.classList.remove('active'));
      } else {
        activePillTipo = targetTipo;
        statPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      }
      currentPage = 1;
      applyFiltersAndRender();
    });
  });

  // Ordenamiento en Columnas
  document.querySelectorAll('.th-sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-col');
      if (sortColumn === col) {
        sortDirection = (sortDirection === 'asc') ? 'desc' : 'asc';
      } else {
        sortColumn = col;
        sortDirection = 'asc';
      }
      applyFiltersAndRender();
    });
  });

  // Exportar CSV
  if (btnDescargar) {
    btnDescargar.addEventListener('click', () => {
      const rows = [
        ['No', 'Codigo', 'Nombre', 'Tipo', 'Provincia', 'Eje de trabajo', 'Transmision', 'Altitud', 'Latitud', 'Longitud']
      ];
      allEstaciones.forEach(item => {
        rows.push([
          item.no,
          `"${item.codigo}"`,
          `"${item.nombre}"`,
          `"${item.tipo}"`,
          `"${item.provincia}"`,
          `"${item.ejeDeTrabajo}"`,
          item.transmision ? 'Activo' : 'Inactivo',
          item.altura,
          item.latitud,
          item.longitud
        ]);
      });

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', 'estaciones_fonag.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // Inicial
  applyFiltersAndRender();

  // Ocultar el loader dedicado de la tabla una vez renderizados los datos
  if (tableLoaderEl) {
    setTimeout(() => {
      tableLoaderEl.classList.add('is-hidden');
      tableLoaderEl.setAttribute('aria-busy', 'false');
    }, 150);
  }
});
