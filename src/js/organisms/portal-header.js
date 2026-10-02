/**
 * Organism: Portal Header & Mobile Responsive Navigation (< 1024px)
 */

export function initPortalHeader() {
  const header = document.getElementById('portal-header');
  if (!header) return;

  if (header.dataset.headerInitialized === 'true') return;
  header.dataset.headerInitialized = 'true';

  const toggleBtn = header.querySelector('#mobile-nav-toggle');
  const nav = header.querySelector('#portal-nav');
  const backdrop = header.querySelector('#portal-nav-backdrop');

  if (!toggleBtn || !nav) return;

  function openMenu() {
    header.classList.add('nav-open');
    toggleBtn.setAttribute('aria-expanded', 'true');
    toggleBtn.setAttribute('aria-label', 'Cerrar menú de navegación');
    document.body.classList.add('mobile-nav-locked');
  }

  function closeMenu() {
    header.classList.remove('nav-open');
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.setAttribute('aria-label', 'Abrir menú de navegación');
    document.body.classList.remove('mobile-nav-locked');

    // Cerrar submenús desplegados en móvil
    header.querySelectorAll('.nav-item-dropdown.is-open').forEach((dropdown) => {
      dropdown.classList.remove('is-open');
      const dropdownLink = dropdown.querySelector('.nav-link-dropdown');
      if (dropdownLink) dropdownLink.setAttribute('aria-expanded', 'false');
    });
  }

  function toggleMenu() {
    const isOpen = header.classList.contains('nav-open');
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  if (backdrop) {
    backdrop.addEventListener('click', closeMenu);
  }

  // Toggle dropdown "Consultas" en vistas menores a 1024px
  header.querySelectorAll('.nav-item-dropdown').forEach((dropdown) => {
    const dropdownLink = dropdown.querySelector('.nav-link-dropdown');
    if (!dropdownLink) return;

    dropdownLink.addEventListener('click', (e) => {
      if (window.innerWidth < 1024) {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('is-open');
        dropdown.classList.toggle('is-open', !isOpen);
        dropdownLink.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      }
    });
  });

  // Cerrar el menú móvil al hacer clic en enlaces de navegación directa
  nav.querySelectorAll('.nav-link:not(.nav-link-dropdown), .nav-dropdown-item, .btn-nav-login').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 1024) {
        closeMenu();
      }
    });
  });

  // Cerrar al pulsar Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('nav-open')) {
      closeMenu();
    }
  });

  // Cerrar al hacer clic fuera del header
  document.addEventListener('click', (e) => {
    if (window.innerWidth < 1024 && header.classList.contains('nav-open')) {
      if (!header.contains(e.target)) {
        closeMenu();
      }
    }
  });

  // Cerrar automáticamente al redimensionar a desktop (>= 1024px)
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024 && header.classList.contains('nav-open')) {
      closeMenu();
    }
  });
}

// Auto-inicialización si el DOM ya está listo
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPortalHeader);
  } else {
    initPortalHeader();
  }
}
