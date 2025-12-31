import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import updateVersionPlugin from './vite-plugin-update-version.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [updateVersionPlugin(), react()],
  server: {
    port: 5273,
    host: true,
  },
})
