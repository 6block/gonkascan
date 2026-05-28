import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    // Don't aggressively modulepreload lazy chunks — that defeats lazy loading
    // by downloading every dynamic chunk during the initial visit.
    modulePreload: false,
    // Default chunking (no manualChunks): Rollup splits per dynamic-import
    // boundary, which is exactly what we want now that route components are
    // wrapped in React.lazy. The shader, charts, markdown, and json-view deps
    // sit only behind dynamic imports, so they end up in their own chunks
    // without manual carving and won't pull each other into the critical path.
  },
})
