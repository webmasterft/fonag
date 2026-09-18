/**
 * Main Application Entry Point
 * Orchestrates atomic modules and bootstraps the application.
 */
import { initButtons } from './atoms/button.js';
import { initSearch } from './molecules/search.js';
import { initThemeToggle } from './organisms/theme-toggle.js';
import { initConstituentsCarousel } from './organisms/constituents-carousel.js';
import { initHomeStationsMap } from './organisms/home-map.js';
import { initGlobalHttpLoader } from './atoms/global-loader.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize atomic interaction modules
  initGlobalHttpLoader();
  initButtons();
  initSearch('#component-search', '.card');
  initThemeToggle();
  initConstituentsCarousel('#constituents-embla');
  initHomeStationsMap();

  // Permite hacer clic en cualquier parte de las tarjetas de Cifras del Portal
  document.querySelectorAll('.stat-card').forEach((card) => {
    const link = card.querySelector('a.btn-cta-orange');
    if (!link) return;
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
      // Si el click no fue en el enlace directo, navegar al destino del botón
      if (!e.target.closest('a')) {
        link.click();
      }
    });
  });

  console.log('FONAG Design System & App Initialized.');
});
