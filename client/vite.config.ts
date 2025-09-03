// © 2025 Joe Pruskowski
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
  server: {
    port: 5173,
    open: false,
    host: true, // allow access from LAN (0.0.0.0)
    proxy: {
      '/healthz': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/readyz': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/logs': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    host: true, // allow access from LAN during vite preview
  },
  build: {
    target: 'es2020',
    sourcemap: mode !== 'production',
  },
}));


