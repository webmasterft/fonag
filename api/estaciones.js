import { sedcGet, sendJson, methodGuard } from './_lib/sedc.js';

/**
 * Vercel Serverless Function: listado autenticado de estaciones (GET /estacion/list/)
 * Route: /api/sedc/estacion/list → /api/estaciones
 * Without a session SEDC returns a reduced row (no est_id / eje_trabajo), so it must be authenticated.
 */
// Only the filters SEDC documents for /estacion/list/ are forwarded with the authenticated session
const ALLOWED_PARAMS = ['nombre', 'codigo', 'administrador', 'est_estado', 'order', 'limit', 'offset', 'year'];

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;
  try {
    const incoming = new URL(req.url, 'http://localhost').searchParams;
    const query = new URLSearchParams();
    ALLOWED_PARAMS.forEach((key) => {
      if (incoming.has(key)) query.set(key, incoming.get(key));
    });
    const qs = query.toString();
    sendJson(res, await sedcGet(`/estacion/list/${qs ? `?${qs}` : ''}`));
  } catch (error) {
    console.error('[Vercel Estaciones Error]:', error);
    res.status(500).json({ error: error.message });
  }
}
