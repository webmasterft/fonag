import { sedcPost, sendJson, methodGuard } from './_lib/sedc.js';

/**
 * Vercel Serverless Function: estado de transmisión de las estaciones con telemetría
 * (POST /ajax/telemetria/mapa_alarma_transmision, the data behind SEDC's "alarma de transmisión" map).
 * Route: /api/sedc/telemetria/alarma_transmision → /api/alarma-transmision
 * Response: { estaciones: GeoJSON features with properties.estado NORMAL | EXPECTANTE | FALLO,
 *             limites: { lim1, lim2 } (hours) }
 */
export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;
  try {
    const sedcResponse = await sedcPost('/ajax/telemetria/mapa_alarma_transmision', {}, {
      referer: '/telemetria/mapa/alarma_transmision',
    });
    sendJson(res, sedcResponse);
  } catch (error) {
    console.error('[Vercel Alarma Transmision Error]:', error);
    res.status(500).json({ error: error.message });
  }
}
