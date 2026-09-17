/**
 * Main Application Entry Point
 * Orchestrates atomic modules and bootstraps the application.
 */
import { initButtons } from './atoms/button.js';
import { initSearch } from './molecules/search.js';
import { initThemeToggle } from './organisms/theme-toggle.js';
import { initConstituentsCarousel } from './organisms/constituents-carousel.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize atomic interaction modules
  initButtons();
  initSearch('#component-search', '.card');
  initThemeToggle();
  initConstituentsCarousel('#constituents-embla');

  console.log('FONAG Design System & App Initialized.');
});
