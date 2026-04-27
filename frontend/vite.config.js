// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // This is same as --host
    port: 5173,
    strictPort: true,
    allowedHosts: [
      'prance-captivate-bling.ngrok-free.dev'
    ]
  }
})