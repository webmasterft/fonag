import { sedcPost, parseBody, sendJson, methodGuard } from './_lib/sedc.js';

/**
 * Vercel Serverless Function: consultas por periodo (POST /reportes/consultas_periodo)
 * Route: /api/sedc/reportes/consultas_periodo → /api/periodo
 * Body JSON: { estacion, variable, frecuencia, fecha_inicio, fecha_fin, export? }
 * export=true returns the official SEDC file (CSV for sub-hourly data, Excel otherwise) instead of JSON.
 */
export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    const body = parseBody(req);
    const isExport = Boolean(body.export);
    const sedcResponse = await sedcPost(
      '/reportes/consultas_periodo',
      {
        estacion: String(body.estacion ?? ''),
        variable: String(body.variable ?? ''),
        frecuencia: String(body.frecuencia ?? ''),
        fecha_inicio: String(body.fecha_inicio ?? ''),
        fecha_fin: String(body.fecha_fin ?? ''),
      },
      // With X-Requested-With Django answers JSON; without it, the export file
      { ajax: !isExport }
    );

    if (!isExport || !sedcResponse) {
      sendJson(res, sedcResponse);
      return;
    }

    // Pass the file through untouched (type and filename as sent by Django)
    res.status(sedcResponse.status);
    ['content-type', 'content-disposition'].forEach((h) => {
      if (sedcResponse.headers[h]) res.setHeader(h, sedcResponse.headers[h]);
    });
    res.send(sedcResponse.buffer);
  } catch (error) {
    console.error('[Vercel Periodo Error]:', error);
    res.status(500).json({ error: error.message });
  }
}
