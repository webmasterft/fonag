import { sedcPost, parseBody, sendJson, methodGuard } from './_lib/sedc.js';

/**
 * Vercel Serverless Function: anuario hidroclimático (POST /hydro_annual)
 * Route: /api/sedc/hydro_annual → /api/hydro-annual
 * Body JSON: { stations: [ {fila de /estacion/list/} ], year, export? }
 * export=true returns the official Excel file instead of JSON.
 */
export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    const body = parseBody(req);
    const isExport = Boolean(body.export);

    // Same form fields the Django page sends (empty filters + selected stations + year)
    const sedcResponse = await sedcPost(
      '/hydro_annual',
      {
        code_station: '',
        name_station: '',
        type_station: '',
        admin_station: '',
        stations: JSON.stringify(body.stations || []),
        year: String(body.year ?? ''),
      },
      // With X-Requested-With Django answers JSON; without it, the Excel file
      { ajax: !isExport }
    );

    if (!isExport || !sedcResponse) {
      sendJson(res, sedcResponse);
      return;
    }

    res.status(sedcResponse.status);
    ['content-type', 'content-disposition'].forEach((h) => {
      if (sedcResponse.headers[h]) res.setHeader(h, sedcResponse.headers[h]);
    });
    res.send(sedcResponse.buffer);
  } catch (error) {
    console.error('[Vercel Hydro Annual Error]:', error);
    res.status(500).json({ error: error.message });
  }
}
