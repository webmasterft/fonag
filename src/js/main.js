/**
 * Main Application Entry Point
 * Orchestrates atomic modules and bootstraps the application.
 */
import { initButtons } from './atoms/button.js';
import { initThemeToggle } from './organisms/theme-toggle.js';
import { initConstituentsCarousel } from './organisms/constituents-carousel.js';
import { initHomeStationsMap } from './organisms/home-map.js';
import { initGlobalHttpLoader } from './atoms/global-loader.js';
import { initPortalHeader } from './organisms/portal-header.js';
import { initPortalStats } from './organisms/portal-stats.js';
import { fetchEstaciones } from './services/estaciones-service.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize atomic interaction modules
  initPortalHeader();
  initGlobalHttpLoader();
  initButtons();
  initThemeToggle();
  initConstituentsCarousel('#constituents-embla');

  // One /estacion/list request shared by the home map and the "Cifras del Portal" figures
  const estacionesPromise = fetchEstaciones();
  initHomeStationsMap(estacionesPromise);
  initPortalStats(estacionesPromise);

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
