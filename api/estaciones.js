import { sedcGet, sendJson, methodGuard } from './_lib/sedc.js';

/**
 * Vercel Serverless Function: listado autenticado de estaciones (GET /estacion/list/)
 * Route: /api/sedc/estacion/list → /api/estaciones
 * Without a session SEDC returns a reduced row (no est_id / eje_trabajo), so it must be authenticated.
 */
const ALLOWED_PARAMS = ['nombre', 'codigo', 'administrador', 'est_estado', 'order', 'limit', 'offset', 'year'];

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;
  try {
    const urlParams = new URL(req.url, 'http://localhost').searchParams;
    const query = new URLSearchParams();

    ALLOWED_PARAMS.forEach((key) => {
      const val = req.query?.[key] ?? urlParams.get(key);
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        query.set(key, String(val).trim());
      }
    });

    // Defaults canónicos para asegurar la lista completa de estaciones administradas
    if (!query.has('administrador')) query.set('administrador', '1');
    if (!query.has('limit')) query.set('limit', '300');

    const qs = query.toString();
    sendJson(res, await sedcGet(`/estacion/list/${qs ? `?${qs}` : ''}`));
  } catch (error) {
    console.error('[Vercel Estaciones Error]:', error);
    res.status(500).json({ error: error.message });
  }
}
