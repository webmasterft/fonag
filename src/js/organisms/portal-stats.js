/**
 * Organism: Cifras del Portal (Home)
 * Every figure is computed from the SEDC API; when a request fails its figure stays as '-'.
 */
import { loadVariables } from '../services/periodo-service.js';

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.textContent = value;
}

/**
 * @param {Promise<Array<Object>>} estacionesPromise Result of fetchEstaciones(), shared with the home map
 */
export async function initPortalStats(estacionesPromise) {
  if (!document.getElementById('stat-estaciones')) return;

  const [estacionesResult, variablesResult] = await Promise.allSettled([estacionesPromise, loadVariables()]);

  if (estacionesResult.status === 'fulfilled') {
    const estaciones = estacionesResult.value;
    setText('#stat-estaciones .stat-number', estaciones.length);
    setText('#stat-telemetria .stat-number', estaciones.filter((est) => est.transmision).length);

    // Years of records: from the earliest est_fecha_inicio to the current year
    const startYears = estaciones
      .map((est) => parseInt((est.fechaInicio || '').substring(0, 4), 10))
      .filter(Number.isFinite);
    if (startYears.length) {
      const firstYear = Math.min(...startYears);
      setText('#stat-anios .stat-number', new Date().getFullYear() - firstYear);
      setText('#stat-variables-desde', firstYear);
    }
  } else {
    console.error('[Home] Error cargando estaciones para las cifras del portal:', estacionesResult.reason);
  }

  if (variablesResult.status === 'fulfilled') {
    setText('#stat-variables .stat-number', variablesResult.value.length);
  } else {
    console.error('[Home] Error cargando variables para las cifras del portal:', variablesResult.reason);
  }
}
