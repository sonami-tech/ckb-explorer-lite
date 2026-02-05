import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import updateVersionPlugin from './vite-plugin-update-version.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [updateVersionPlugin(), react()],
  server: {
    port: 5273,
    host: true,
    proxy: {
      // Proxy stats server requests to avoid CORS during development.
      '/stats-api': {
        target: 'http://127.0.0.1:8116',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/stats-api/, ''),
      },
    },
  },
})
