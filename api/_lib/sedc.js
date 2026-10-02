import https from 'https';

/**
 * Shared SEDC helpers for the Vercel Serverless Functions (files under api/_lib are not routes).
 * Mirrors the authenticated proxy that vite.config.js provides in development.
 * Credentials come only from the Vercel environment variables SEDC_USERNAME / SEDC_PASSWORD.
 */

const SESSION_TTL_MS = 1000 * 60 * 30;
let sessionCache = null;

export function getConfig() {
  return {
    baseUrl: process.env.SEDC_API_BASE_URL || 'https://sedc.fonag.org.ec',
    username: process.env.SEDC_USERNAME || '',
    password: process.env.SEDC_PASSWORD || '',
  };
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

/**
 * Logs in to SEDC (Django session + CSRF) and caches the session while the function instance lives.
 * @returns {Promise<{ csrf: string, cookie: string } | null>}
 */
export async function getSedcSession() {
  if (sessionCache && Date.now() < sessionCache.expires) return sessionCache;

  const { baseUrl, username, password } = getConfig();
  if (!username || !password) {
    console.error('[SEDC] SEDC_USERNAME / SEDC_PASSWORD are not set in the Vercel environment');
    return null;
  }

  try {
    const loginPage = await requestHttps(`${baseUrl}/login/`);
    let initialCsrf = '';
    (loginPage.headers['set-cookie'] || []).forEach((c) => {
      if (c.startsWith('csrftoken=')) initialCsrf = c.split(';')[0].split('=')[1];
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
    (loginRes.headers['set-cookie'] || []).forEach((c) => {
      if (c.startsWith('csrftoken=')) csrf = c.split(';')[0].split('=')[1];
      if (c.startsWith('sessionid=')) sessionId = c.split(';')[0].split('=')[1];
    });
    if (!sessionId) {
      console.error('[SEDC] Login did not return a session (check the credentials)');
      return null;
    }

    sessionCache = { csrf, cookie: `csrftoken=${csrf}; sessionid=${sessionId}`, expires: Date.now() + SESSION_TTL_MS };
    return sessionCache;
  } catch (err) {
    console.error('[SEDC] Login error:', err);
    return null;
  }
}

/**
 * Authenticated POST (form-urlencoded + CSRF) to a SEDC path.
 * @param {string} path e.g. '/reportes/consultas_periodo'
 * @param {Object<string, string>} fields form fields (csrfmiddlewaretoken is added)
 * @param {{ referer?: string, ajax?: boolean }} [opts] ajax=false omits X-Requested-With (file exports)
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
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return Object.fromEntries(new URLSearchParams(req.body));
    }
  }
  return req.body;
}

/** Sends the SEDC JSON response through, or 502 when the session could not be created. */
export function sendJson(res, sedcResponse) {
  if (!sedcResponse) {
    res.status(502).json({ error: 'No se pudo autenticar con SEDC' });
    return;
  }
  res.status(sedcResponse.status);
  res.setHeader('Content-Type', 'application/json');
  res.send(sedcResponse.body);
}

export function methodGuard(req, res, method) {
  if (req.method === method) return true;
  res.status(405).json({ error: 'Method Not Allowed' });
  return false;
}
