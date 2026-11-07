import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {output: {manualChunks(id) {if(id.endsWith('/data/initial-snapshot.json'))return 'source-snapshot';}}},
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/v1': { target: process.env.NAVIGATOR_BACKEND_URL || 'http://127.0.0.1:8000', changeOrigin: true },
      '/health': { target: process.env.NAVIGATOR_BACKEND_URL || 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
});
