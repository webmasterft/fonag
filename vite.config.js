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
  const username = env.SEDC_USERNAME || '***REMOVED***';
  const password = env.SEDC_PASSWORD || '***REMOVED***';

  return {
    plugins: [
      tailwindcss(),
      {
        name: 'sedc-authenticated-api-middleware',
        configureServer(server) {
          /**
           * /api/sedc/estacion/list → autenticado con sesión SEDC
           * Garantiza que eje_trabajo sea devuelto correctamente por el backend Django.
           */
          server.middlewares.use('/api/sedc/estacion/list', async (req, res) => {
            console.log('[SEDC Estacion List] req.url:', req.url);
            try {
              const session = await getSedcSession(baseUrl, username, password);
              console.log('[SEDC Estacion List] session ok:', !!session, 'has sessionId:', session?.cookie?.includes('sessionid='));
              if (!session) {
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'No se pudo autenticar con SEDC' }));
                return;
              }
              const urlObj = new URL(req.url, 'http://localhost');
              const qs = urlObj.search || '?administrador=1&limit=300';
              const targetUrl = `${baseUrl}/estacion/list/${qs}`;
              console.log('[SEDC Estacion List] targetUrl:', targetUrl);
              console.log('[SEDC Estacion List] cookie preview:', session.cookie.substring(0, 50));
              const sedcResponse = await requestHttps(
                targetUrl,
                {
                  headers: {
                    Cookie: session.cookie,
                    Referer: baseUrl,
                    'X-Requested-With': 'XMLHttpRequest',
                  },
                }
              );
              console.log('[SEDC Estacion List] sedcResponse.status:', sedcResponse.status, 'body prefix:', sedcResponse.body.substring(0, 80));
              res.statusCode = sedcResponse.status;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(sedcResponse.body);
            } catch (error) {
              console.error('[SEDC Estacion List Error]:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error.message }));
            }
          });

          /**
           * /api/sedc/telemetria/consulta → POST autenticado
           */
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
                console.error('[SEDC Telemetria Middleware Error]:', error);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: error.message }));
              }
            });
          });

          /**
           * /api/sedc/reportes/consultas_periodo → POST autenticado
           */
          server.middlewares.use('/api/sedc/reportes/consultas_periodo', async (req, res) => {
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

                const estacionId = parsed.estacion || '50';
                const variableId = parsed.variable || '1';
                const frecuenciaId = parsed.frecuencia || '4';
                const fechaInicio = parsed.fecha_inicio || '2023-01-01';
                const fechaFin = parsed.fecha_fin || '2023-12-31';

                const session = await getSedcSession(baseUrl, username, password);
                if (!session) {
                  res.statusCode = 502;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'No se pudo autenticar con SEDC' }));
                  return;
                }

                const postPayload =
                  'estacion=' + encodeURIComponent(estacionId) +
                  '&variable=' + encodeURIComponent(variableId) +
                  '&frecuencia=' + encodeURIComponent(frecuenciaId) +
                  '&fecha_inicio=' + encodeURIComponent(fechaInicio) +
                  '&fecha_fin=' + encodeURIComponent(fechaFin) +
                  '&csrfmiddlewaretoken=' + encodeURIComponent(session.csrf);

                const sedcResponse = await requestHttps(
                  `${baseUrl}/reportes/consultas_periodo`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/x-www-form-urlencoded',
                      Cookie: session.cookie,
                      'X-CSRFToken': session.csrf,
                      Referer: `${baseUrl}/reportes/consultas_periodo`,
                      'X-Requested-With': 'XMLHttpRequest',
                    },
                  },
                  postPayload
                );

                res.statusCode = sedcResponse.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(sedcResponse.body);
              } catch (error) {
                console.error('[SEDC Periodo Middleware Error]:', error);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: error.message }));
              }
            });
          });

          /**
           * /api/sedc/* → proxy genérico sin autenticación de sesión
           * (point_geojson y otros endpoints públicos)
           */
          server.middlewares.use('/api/sedc', async (req, res) => {
            try {
              const urlObj = new URL(req.url, 'http://localhost');
              const sedcPath = urlObj.pathname.replace(/^\/api\/sedc/, '') + (urlObj.search || '');
              const sedcResponse = await requestHttps(`${baseUrl}${sedcPath}`, {
                headers: { Referer: baseUrl },
              });
              res.statusCode = sedcResponse.status;
              res.setHeader('Content-Type', sedcResponse.headers['content-type'] || 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(sedcResponse.body);
            } catch (error) {
              console.error('[SEDC Generic Proxy Error]:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error.message }));
            }
          });
        },
      },
    ],
    server: {
      port: 9000,
      open: false,
      // Sin proxy genérico — todo /api/sedc/* es manejado por los middlewares de arriba
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          anuario: resolve(__dirname, 'consultas/anuario/index.html'),
          periodo: resolve(__dirname, 'consultas/periodo/index.html'),
          estaciones: resolve(__dirname, 'estaciones/index.html'),
          tiempoReal: resolve(__dirname, 'tiempo-real/index.html'),
          contacto: resolve(__dirname, 'contacto/index.html'),
        },
      },
    },
  };
});
