import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import updateVersionPlugin from './vite-plugin-update-version.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [updateVersionPlugin(), react()],
  server: {
    port: 5273,
    host: true,
    allowedHosts: ['explorer.ckbdev.com'],
    proxy: {
      // Proxy CKB node RPC requests to avoid CORS and enable external access.
      '/rpc/archive': {
        target: 'http://192.168.0.74:8114',
        changeOrigin: true,
        rewrite: () => '/',
      },
      '/rpc/mainnet': {
        target: 'http://192.168.0.73:8114',
        changeOrigin: true,
        rewrite: () => '/',
      },
      '/rpc/testnet': {
        target: 'http://192.168.0.73:18114',
        changeOrigin: true,
        rewrite: () => '/',
      },
      // Proxy stats server requests.
      '/rpc/stats': {
        target: 'http://127.0.0.1:8116',
        changeOrigin: true,
        rewrite: () => '/',
      },
    },
  },
})
