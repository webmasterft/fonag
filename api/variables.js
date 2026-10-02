import { sedcGet, sendJson, methodGuard } from './_lib/sedc.js';

/**
 * Vercel Serverless Function: catálogo de variables (GET /variable/<seccion>/list)
 * Route: /api/sedc/variable/:seccion/list → /api/variables?seccion=:seccion
 */
export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;
  const seccion = new URL(req.url, 'http://localhost').searchParams.get('seccion') || 'hidro';
  // Only a plain section name is forwarded (no path traversal into other SEDC routes)
  if (!/^[a-z_]+$/i.test(seccion)) {
    res.status(400).json({ error: 'Sección inválida' });
    return;
  }
  try {
    sendJson(res, await sedcGet(`/variable/${seccion}/list`));
  } catch (error) {
    console.error('[Vercel Variables Error]:', error);
    res.status(500).json({ error: error.message });
  }
}
