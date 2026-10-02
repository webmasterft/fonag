import { sedcPost, parseBody, sendJson, methodGuard } from './_lib/sedc.js';

/**
 * Vercel Serverless Function: consultas por periodo (POST /reportes/consultas_periodo)
 * Route: /api/sedc/reportes/consultas_periodo → /api/periodo
 */
export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    const body = parseBody(req);
    const sedcResponse = await sedcPost('/reportes/consultas_periodo', {
      estacion: String(body.estacion ?? ''),
      variable: String(body.variable ?? ''),
      frecuencia: String(body.frecuencia ?? ''),
      fecha_inicio: String(body.fecha_inicio ?? ''),
      fecha_fin: String(body.fecha_fin ?? ''),
    });
    sendJson(res, sedcResponse);
  } catch (error) {
    console.error('[Vercel Periodo Error]:', error);
    res.status(500).json({ error: error.message });
  }
}
