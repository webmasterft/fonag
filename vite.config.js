import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  server: {
    port: 3000,
    open: false,
    proxy: {
      '/api/sedc': {
        target: 'https://sedc.fonag.org.ec',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/sedc/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        anuario: resolve(__dirname, 'consultas/anuario/index.html'),
      },
    },
  },
});
