import https from 'https';

/**
 * Vercel Serverless Function: Proxy autenticado para Telemetría SEDC
 * Ruta: /api/telemetria
 */

let sessionCache = null;

function requestHttps(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };
    if (postData) {
      opts.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () =>
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body,
        })
      );
    });
    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function getSedcSession(baseUrl, username, password) {
  if (sessionCache && Date.now() < sessionCache.expires) {
    return sessionCache;
  }

  try {
    const loginPage = await requestHttps(`${baseUrl}/login/`);
    let initialCsrf = '';
    (loginPage.headers['set-cookie'] || []).forEach((c) => {
      if (c.startsWith('csrftoken=')) {
        initialCsrf = c.split(';')[0].split('=')[1];
      }
    });

    const postData =
      'username=' +
      encodeURIComponent(username) +
      '&password=' +
      encodeURIComponent(password) +
      '&csrfmiddlewaretoken=' +
      encodeURIComponent(initialCsrf) +
      '&next=/';

    const loginRes = await requestHttps(
      `${baseUrl}/login/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: `csrftoken=${initialCsrf}`,
          Referer: `${baseUrl}/login/`,
        },
      },
      postData
    );

    let finalCsrf = initialCsrf;
    let sessionId = '';
    (loginRes.headers['set-cookie'] || []).forEach((c) => {
      if (c.startsWith('csrftoken=')) finalCsrf = c.split(';')[0].split('=')[1];
      if (c.startsWith('sessionid=')) sessionId = c.split(';')[0].split('=')[1];
    });

    sessionCache = {
      csrf: finalCsrf,
      cookie: `csrftoken=${finalCsrf}; sessionid=${sessionId}`,
      expires: Date.now() + 1000 * 60 * 30, // 30 minutos de caché
    };

    return sessionCache;
  } catch (err) {
    console.error('[Vercel SEDC Auth Error]:', err);
    return null;
  }
}

export default async function handler(req, res) {
  // Configurar headers CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const baseUrl = process.env.SEDC_API_BASE_URL || 'https://sedc.fonag.org.ec';
    const username = process.env.SEDC_USERNAME || '***REMOVED***';
    const password = process.env.SEDC_PASSWORD || '***REMOVED***';

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const estacionId = body.estacion || '38';
    const fechaInicio = body.inicio || new Date().toISOString().substring(0, 10);

    const session = await getSedcSession(baseUrl, username, password);
    if (!session) {
      res.status(502).json({ error: 'No se pudo autenticar con SEDC de FONAG' });
      return;
    }

    const postPayload =
      'estacion=' +
      encodeURIComponent(estacionId) +
      '&inicio=' +
      encodeURIComponent(fechaInicio) +
      '&csrfmiddlewaretoken=' +
      encodeURIComponent(session.csrf);

    const sedcResponse = await requestHttps(
      `${baseUrl}/ajax/telemetria/consulta`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: session.cookie,
          'X-CSRFToken': session.csrf,
          Referer: `${baseUrl}/telemetria/visualizar/`,
          'X-Requested-With': 'XMLHttpRequest',
        },
      },
      postPayload
    );

    res.status(sedcResponse.status);
    res.setHeader('Content-Type', 'application/json');
    res.send(sedcResponse.body);
  } catch (error) {
    console.error('[Vercel Serverless Telemetria Error]:', error);
    res.status(500).json({ error: error.message });
  }
}
