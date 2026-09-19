import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import https from 'https';

/**
 * Gestor de sesión persistente con el backend SEDC de FONAG
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
      res.on('data', (c) => (body += c));
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
      expires: Date.now() + 1000 * 60 * 30, // 30 minutos de caché de sesión
    };

    return sessionCache;
  } catch (err) {
    console.error('[SEDC Proxy Auth Error]:', err);
    return null;
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const baseUrl = env.SEDC_API_BASE_URL || 'https://sedc.fonag.org.ec';
  const username = env.SEDC_USERNAME || 'consultor.externo';
  const password = env.SEDC_PASSWORD || '7!FW9#usUU';
  const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

  return {
    plugins: [
      tailwindcss(),
      {
        name: 'sedc-telemetria-api-middleware',
        configureServer(server) {
          // Endpoint dedicado para consultar telemetría en tiempo real con sesión autenticada
          server.middlewares.use('/api/sedc/telemetria/consulta', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end(JSON.stringify({ error: 'Method Not Allowed' }));
              return;
            }

            let rawBody = '';
            req.on('data', (chunk) => (rawBody += chunk));
            req.on('end', async () => {
              try {
                let parsed = {};
                try {
                  parsed = JSON.parse(rawBody);
                } catch {
                  const sp = new URLSearchParams(rawBody);
                  for (const [k, v] of sp) parsed[k] = v;
                }

                const estacionId = parsed.estacion || '38';
                const fechaInicio = parsed.inicio || new Date().toISOString().substring(0, 10);

                const session = await getSedcSession(baseUrl, username, password);
                if (!session) {
                  res.statusCode = 502;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'No se pudo autenticar con SEDC' }));
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

                res.statusCode = sedcResponse.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(sedcResponse.body);
              } catch (error) {
                console.error('[SEDC Middleware Error]:', error);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: error.message }));
              }
            });
          });
        },
      },
    ],
    server: {
      port: 9000,
      open: false,
      proxy: {
        '/api/sedc': {
          target: baseUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/sedc/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', authHeader);
            });
          },
        },
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          anuario: resolve(__dirname, 'consultas/anuario/index.html'),
          periodo: resolve(__dirname, 'consultas/periodo/index.html'),
          estaciones: resolve(__dirname, 'estaciones/index.html'),
          tiempoReal: resolve(__dirname, 'tiempo-real/index.html'),
        },
      },
    },
  };
});
