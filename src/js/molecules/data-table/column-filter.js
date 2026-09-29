/**
 * Component: Column Visibility Filter Dropdown
 * Maneja el menú desplegable para mostrar u ocultar columnas en cualquier tabla FONAG.
 */

/**
 * Inicializa el filtro de visibilidad de columnas para un contenedor de botón y una tabla.
 * Si no se proporciona `columnsConfig`, este se auto-detecta escaneando los `th[data-col]` de la tabla.
 * 
 * @param {HTMLElement|string} buttonOrContainer - Botón trigger (.btn-columnas-dropdown) o su wrapper.
 * @param {HTMLElement|string} tableElement - Elemento <table> objetivo.
 * @param {Array<{key: string, label: string, defaultVisible?: boolean}>} [columnsConfig] - Configuración opcional de columnas.
 * @param {Function} [onToggleCallback] - Callback opcional invocado al cambiar la visibilidad.
 */
export function initColumnFilter(buttonOrContainer, tableElement, columnsConfig, onToggleCallback) {
  const triggerBtn = typeof buttonOrContainer === 'string' 
    ? document.querySelector(buttonOrContainer) 
    : buttonOrContainer;
  const table = typeof tableElement === 'string' 
    ? document.querySelector(tableElement) 
    : tableElement;

  if (!triggerBtn || !table) return;

  // Auto-detectar columnas de la tabla si no se pasaron explícitamente
  let cols = columnsConfig;
  if (!Array.isArray(cols) || cols.length === 0) {
    cols = [];
    const thElements = table.querySelectorAll('thead th[data-col]');
    const addedKeys = new Set();

    thElements.forEach(th => {
      const key = th.getAttribute('data-col');
      if (key && !addedKeys.has(key)) {
        addedKeys.add(key);
        // Limpiar el texto del th de íconos o caracteres especiales
        const labelText = th.innerText.replace(/[▲▼↕\n]/g, '').trim() || key;
        cols.push({
          key,
          label: labelText,
          defaultVisible: !th.classList.contains('col-hidden')
        });
      }
    });
  }

  if (cols.length === 0) return;

  // Convertir el botón en un contenedor relativo si no lo es
  let wrapper = triggerBtn.parentElement;
  if (!wrapper.classList.contains('column-filter-container')) {
    const newWrapper = document.createElement('div');
    newWrapper.className = 'column-filter-container';
    triggerBtn.parentNode.insertBefore(newWrapper, triggerBtn);
    newWrapper.appendChild(triggerBtn);
    wrapper = newWrapper;
  }

  // Crear o reutilizar menú
  let menu = wrapper.querySelector('.column-filter-menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.className = 'column-filter-menu';
    wrapper.appendChild(menu);
  }

  // Estado de visibilidad de columnas (mapeado por key)
  const visibilityState = {};
  cols.forEach(col => {
    visibilityState[col.key] = col.defaultVisible !== false;
  });

  // Renderizar items del menú
  function renderMenuItems() {
    menu.innerHTML = cols.map(col => {
      const isChecked = visibilityState[col.key];
      const checkClass = isChecked ? 'is-checked' : 'is-unchecked';
      
      return `
        <div class="column-filter-item ${checkClass}" data-col-key="${col.key}">
          <svg class="check-icon" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>${col.label}</span>
        </div>
      `;
    }).join('');

    // Event listeners en cada item
    menu.querySelectorAll('.column-filter-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = item.getAttribute('data-col-key');
        visibilityState[key] = !visibilityState[key];
        applyVisibility();
        renderMenuItems();
        if (typeof onToggleCallback === 'function') {
          onToggleCallback(visibilityState);
        }
      });
    });
  }

  // Aplicar visibilidad en la tabla agregando/quitando clase .col-hidden
  function applyVisibility() {
    cols.forEach(col => {
      const isVisible = visibilityState[col.key];
      const cells = table.querySelectorAll(`[data-col="${col.key}"]`);
      cells.forEach(cell => {
        if (isVisible) {
          cell.classList.remove('col-hidden');
        } else {
          cell.classList.add('col-hidden');
        }
      });
    });
  }

  // Toggle menú al hacer click en el botón
  triggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    wrapper.classList.toggle('is-open');
  });

  // Cerrar menú al hacer click fuera
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      wrapper.classList.remove('is-open');
    }
  });

  // Inicializar
  renderMenuItems();
  applyVisibility();

  return {
    visibilityState,
    applyVisibility
  };
}
