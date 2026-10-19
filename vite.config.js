import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { getConfig, requestHttps } from './api/_lib/sedc.js';
import estacionesHandler from './api/estaciones.js';
import variablesHandler from './api/variables.js';
import hydroAnnualHandler from './api/hydro-annual.js';
import telemetriaHandler from './api/telemetria.js';
import alarmaTransmisionHandler from './api/alarma-transmision.js';
import periodoHandler from './api/periodo.js';

/**
 * Development proxy for the SEDC API.
 * It runs the very same Vercel Serverless Functions (api/*.js + api/_lib/sedc.js) that serve
 * production, mounted on the same /api/sedc/* paths that vercel.json rewrites, so dev and prod
 * share one implementation (login, CSRF, forwarded fields, exports).
 */
const SEDC_ROUTES = [
  { pattern: /^\/api\/sedc\/estacion\/list\/?$/, handler: estacionesHandler },
  { pattern: /^\/api\/sedc\/variable\/([^/]+)\/list\/?$/, handler: variablesHandler, query: (match) => ({ seccion: match[1] }) },
  { pattern: /^\/api\/sedc\/hydro_annual\/?$/, handler: hydroAnnualHandler },
  { pattern: /^\/api\/sedc\/telemetria\/consulta\/?$/, handler: telemetriaHandler },
  { pattern: /^\/api\/sedc\/telemetria\/alarma_transmision\/?$/, handler: alarmaTransmisionHandler },
  { pattern: /^\/api\/sedc\/reportes\/consultas_periodo\/?$/, handler: periodoHandler },
];

// Public SEDC endpoint that vercel.json rewrites straight to SEDC (no session needed)
const PUBLIC_SEDC_PATHS = ['/api/sedc/point_geojson'];

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => resolveBody(raw));
    req.on('error', reject);
  });
}

/** Adds the Vercel response helpers (status / json / send) the api/*.js handlers use. */
function withVercelResponse(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
    return res;
  };
  res.send = (body) => {
    res.end(body);
    return res;
  };
  return res;
}

function sedcDevMiddleware() {
  return async (req, res) => {
    const url = new URL(req.originalUrl || req.url, 'http://localhost');
    const route = SEDC_ROUTES.find((r) => r.pattern.test(url.pathname));

    try {
      if (route) {
        req.query = { ...Object.fromEntries(url.searchParams), ...(route.query?.(route.pattern.exec(url.pathname)) || {}) };
        // Vercel hands the raw body to the handler; parseBody() accepts JSON or form-urlencoded strings
        req.body = req.method === 'POST' ? await readBody(req) : undefined;
        await route.handler(req, withVercelResponse(res));
        return;
      }

      if (PUBLIC_SEDC_PATHS.includes(url.pathname)) {
        const { baseUrl } = getConfig();
        const sedcPath = url.pathname.replace(/^\/api\/sedc/, '') + url.search;
        const sedcResponse = await requestHttps(`${baseUrl}${sedcPath}`, { headers: { Referer: baseUrl } });
        res.statusCode = sedcResponse.status;
        res.setHeader('Content-Type', sedcResponse.headers['content-type'] || 'application/json');
        res.end(sedcResponse.buffer);
        return;
      }

      // Same as production: any other /api/sedc/* path does not exist
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Not Found' }));
    } catch (error) {
      console.error('[SEDC Dev Proxy Error]:', error);
      if (res.headersSent) {
        res.end();
        return;
      }
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: error.message }));
    }
  };
}

export default defineConfig(({ mode }) => {
  // api/_lib/sedc.js reads process.env (as on Vercel): expose the SEDC_* values from .env there.
  // Credentials come only from .env (SEDC_USERNAME / SEDC_PASSWORD); never hardcode them here.
  const env = loadEnv(mode, process.cwd(), 'SEDC_');
  Object.entries(env).forEach(([key, value]) => {
    process.env[key] = value;
  });
  const { username, password } = getConfig();
  if (!username || !password) {
    console.warn('[SEDC Proxy] SEDC_USERNAME / SEDC_PASSWORD no están definidos en .env: los endpoints autenticados fallarán.');
  }

  return {
    plugins: [
      tailwindcss(),
      {
        name: 'sedc-authenticated-api-middleware',
        configureServer(server) {
          server.middlewares.use('/api/sedc', sedcDevMiddleware());
        },
      },
    ],
    server: {
      port: 9000,
      open: false,
      // Sin proxy genérico — todo /api/sedc/* es manejado por el middleware de arriba
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
