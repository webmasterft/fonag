import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const username = env.SEDC_USERNAME;
  const password = env.SEDC_PASSWORD;
  const authHeader = (username && password)
    ? `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
    : null;

  return {
    plugins: [
      tailwindcss(),
    ],
    server: {
      port: 9000,
      open: false,
      proxy: {
        '/api/sedc': {
          target: env.SEDC_API_BASE_URL || 'https://sedc.fonag.org.ec',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/sedc/, ''),
          configure: (proxy) => {
            if (authHeader) {
              proxy.on('proxyReq', (proxyReq) => {
                proxyReq.setHeader('Authorization', authHeader);
              });
            }
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
