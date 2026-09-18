/**
 * Global HTTP Loader Component & Fetch Interceptor
 * Intercepta peticiones fetch al servidor (/api/ o externas) y proyecta un loader animado
 * de alta fidelidad visual en la esquina o en overlay según se requiera.
 */

let activeRequestsCount = 0;
let loaderContainer = null;
let progressBarEl = null;

/**
 * Crea o retorna el contenedor DOM del loader global animado.
 */
function ensureLoaderElement() {
  if (loaderContainer) return loaderContainer;

  // Barra superior de progreso discreto y elegante
  progressBarEl = document.createElement('div');
  progressBarEl.className = 'fonag-top-progress-bar';
  progressBarEl.innerHTML = '<div class="fonag-top-progress-fill"></div>';
  document.body.appendChild(progressBarEl);

  // Widget animado flotante de estado de carga
  loaderContainer = document.createElement('div');
  loaderContainer.id = 'fonag-global-loader';
  loaderContainer.className = 'fonag-global-loader';
  loaderContainer.setAttribute('role', 'status');
  loaderContainer.setAttribute('aria-live', 'polite');
  loaderContainer.innerHTML = `
    <div class="fonag-loader-card">
      <div class="fonag-loader-spinner-wrapper">
        <div class="fonag-loader-ring"></div>
        <div class="fonag-loader-inner-dot"></div>
      </div>
      <div class="fonag-loader-text-group">
        <span class="fonag-loader-title">Consultando servidor...</span>
        <span class="fonag-loader-subtitle">Cargando información hidroclimática</span>
      </div>
    </div>
  `;
  document.body.appendChild(loaderContainer);
  return loaderContainer;
}

/**
 * Muestra el loader animado
 */
export function showGlobalLoader(customTitle = 'Consultando servidor...') {
  ensureLoaderElement();
  activeRequestsCount++;

  if (activeRequestsCount > 0) {
    loaderContainer.classList.add('is-active');
    progressBarEl.classList.add('is-active');
    const titleEl = loaderContainer.querySelector('.fonag-loader-title');
    if (titleEl && customTitle) {
      titleEl.textContent = customTitle;
    }
  }
}

/**
 * Oculta el loader animado cuando todas las peticiones activas han concluido
 */
export function hideGlobalLoader() {
  activeRequestsCount = Math.max(0, activeRequestsCount - 1);
  if (activeRequestsCount === 0 && loaderContainer) {
    loaderContainer.classList.remove('is-active');
    if (progressBarEl) {
      progressBarEl.classList.remove('is-active');
    }
  }
}

/**
 * Inicializa el interceptor global sobre window.fetch.
 * Cada vez que cualquier servicio o script ejecute una petición HTTP al servidor,
 * el loader animado se activará automáticamente hasta finalizar la respuesta.
 */
export function initGlobalHttpLoader() {
  if (typeof window === 'undefined') return;
  if (window.__fonagHttpLoaderInitialized) return;
  window.__fonagHttpLoaderInitialized = true;

  ensureLoaderElement();

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
    
    // Identificar peticiones al servidor o APIs
    const isServerRequest = url.includes('/api/') || url.includes('http://') || url.includes('https://') || url.includes('.json');

    if (isServerRequest) {
      showGlobalLoader();
    }

    try {
      const response = await originalFetch.apply(this, args);
      return response;
    } finally {
      if (isServerRequest) {
        // Breve gracia visual para transiciones suaves de animación
        setTimeout(() => {
          hideGlobalLoader();
        }, 280);
      }
    }
  };
}
