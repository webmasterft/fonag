import https from 'https';

/**
 * Shared SEDC helpers for the Vercel Serverless Functions (files under api/_lib are not routes).
 * Mirrors the authenticated proxy that vite.config.js provides in development.
 * Credentials come only from the Vercel environment variables SEDC_USERNAME / SEDC_PASSWORD.
 */

const SESSION_TTL_MS = 1000 * 60 * 30;
let sessionCache = null;

export function getConfig() {
  const clean = (val) => (val || '').trim().replace(/^["']|["']$/g, '').trim();
  return {
    baseUrl: clean(process.env.SEDC_API_BASE_URL || 'https://sedc.fonag.org.ec').replace(/\/$/, ''),
    username: clean(process.env.SEDC_USERNAME),
    password: clean(process.env.SEDC_PASSWORD),
  };
}

/**
 * Agrega headers CORS para permitir peticiones desde cualquier origen o preview de Vercel.
 */
export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Authorization');
}

/**
 * HTTPS request that keeps the raw bytes too (binary responses such as Excel exports).
 */
export function requestHttps(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: { ...(options.headers || {}) },
    };
    if (postData) {
      opts.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({ status: res.statusCode, headers: res.headers, body: buffer.toString('utf8'), buffer });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function parseCookies(rawHeader) {
  if (!rawHeader) return [];
  return Array.isArray(rawHeader) ? rawHeader : [String(rawHeader)];
}

/**
 * Logs in to SEDC (Django session + CSRF) and caches the session while the function instance lives.
 * @returns {Promise<{ csrf: string, cookie: string } | null>}
 */
export async function getSedcSession() {
  if (sessionCache && Date.now() < sessionCache.expires) return sessionCache;

  const { baseUrl, username, password } = getConfig();
  if (!username || !password) {
    const missing = [];
    if (!username) missing.push('SEDC_USERNAME');
    if (!password) missing.push('SEDC_PASSWORD');
    console.error(`[SEDC] Variables de entorno faltantes en Vercel: ${missing.join(', ')}`);
    return null;
  }

  try {
    const loginPage = await requestHttps(`${baseUrl}/login/`);
    let initialCsrf = '';
    parseCookies(loginPage.headers['set-cookie']).forEach((c) => {
      const match = /csrftoken=([^;]+)/.exec(c);
      if (match) initialCsrf = match[1];
    });

    const postData = new URLSearchParams({
      username,
      password,
      csrfmiddlewaretoken: initialCsrf,
      next: '/',
    }).toString();

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

    let csrf = initialCsrf;
    let sessionId = '';
    parseCookies(loginRes.headers['set-cookie']).forEach((c) => {
      const matchCsrf = /csrftoken=([^;]+)/.exec(c);
      if (matchCsrf) csrf = matchCsrf[1];
      const matchSession = /sessionid=([^;]+)/.exec(c);
      if (matchSession) sessionId = matchSession[1];
    });

    if (!sessionId) {
      console.error('[SEDC] Login did not return a sessionid cookie. Verifica que SEDC_USERNAME y SEDC_PASSWORD sean correctos.');
      return null;
    }

    sessionCache = { csrf, cookie: `csrftoken=${csrf}; sessionid=${sessionId}`, expires: Date.now() + SESSION_TTL_MS };
    return sessionCache;
  } catch (err) {
    console.error('[SEDC] Error conectando con SEDC:', err);
    return null;
  }
}

/**
 * Authenticated POST (form-urlencoded + CSRF) to a SEDC path.
 */
export async function sedcPost(path, fields, { referer, ajax = true } = {}) {
  const { baseUrl } = getConfig();
  const session = await getSedcSession();
  if (!session) return null;

  const payload = new URLSearchParams({ ...fields, csrfmiddlewaretoken: session.csrf }).toString();
  return requestHttps(
    `${baseUrl}${path}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: session.cookie,
        'X-CSRFToken': session.csrf,
        Referer: `${baseUrl}${referer || path}`,
        ...(ajax ? { 'X-Requested-With': 'XMLHttpRequest' } : {}),
      },
    },
    payload
  );
}

/**
 * Authenticated GET to a SEDC path (path may include the query string).
 */
export async function sedcGet(pathWithQuery) {
  const { baseUrl } = getConfig();
  const session = await getSedcSession();
  if (!session) return null;

  return requestHttps(`${baseUrl}${pathWithQuery}`, {
    headers: { Cookie: session.cookie, Referer: baseUrl, 'X-Requested-With': 'XMLHttpRequest' },
  });
}

export function parseBody(req) {
  if (!req.body) return {};
  let body = req.body;
  if (Buffer.isBuffer(body)) {
    body = body.toString('utf8');
  }
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return Object.fromEntries(new URLSearchParams(body));
    }
  }
  return body;
}

/** Sends the SEDC JSON response through, or 502 when the session could not be created. */
export function sendJson(res, sedcResponse) {
  setCorsHeaders(res);
  if (!sedcResponse) {
    const { username, password } = getConfig();
    let msg = 'No se pudo autenticar con SEDC.';
    if (!username || !password) {
      const missing = [];
      if (!username) missing.push('SEDC_USERNAME');
      if (!password) missing.push('SEDC_PASSWORD');
      msg = `Variables no configuradas en Vercel: ${missing.join(', ')}. Recuerda desplegar nuevamente tras agregarlas.`;
    } else {
      msg = 'SEDC rechazó las credenciales configuradas en Vercel. Verifica usuario y contraseña.';
    }
    res.status(502).json({ error: msg });
    return;
  }
  res.status(sedcResponse.status || 200);
  res.setHeader('Content-Type', 'application/json');
  res.send(sedcResponse.body);
}

export function methodGuard(req, res, method) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }
  if (req.method === method) return true;
  res.status(405).json({ error: 'Method Not Allowed' });
  return false;
}
