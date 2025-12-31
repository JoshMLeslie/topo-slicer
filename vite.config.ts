import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/topo-slicer/',
  plugins: [react()],
  server: {
    proxy: {
      '/api/elevation': {
        target: 'https://api.opentopodata.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/elevation/, '/v1/ned10m'),
      },
    },
  },
})
