import { sedcPost, parseBody, sendJson, methodGuard } from './_lib/sedc.js';

/**
 * Vercel Serverless Function: telemetría (POST /ajax/telemetria/consulta)
 * Route: /api/sedc/telemetria/consulta → /api/telemetria
 */
export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    const body = parseBody(req);
    const sedcResponse = await sedcPost(
      '/ajax/telemetria/consulta',
      {
        estacion: String(body.estacion ?? ''),
        inicio: String(body.inicio ?? ''),
      },
      { referer: '/telemetria/visualizar/' }
    );
    sendJson(res, sedcResponse);
  } catch (error) {
    console.error('[Vercel Telemetria Error]:', error);
    res.status(500).json({ error: error.message });
  }
}
