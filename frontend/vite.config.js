// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // This is same as --host
    port: 5173,
    strictPort: true,
    proxy: {
      // REST API -> backend
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
      // Uploaded files -> backend static folder
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
      // Socket.IO (websocket + polling) -> backend
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
    allowedHosts: [
      'prance-captivate-bling.ngrok-free.dev'
    ]
  }
})