import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 4173,
    // Permitir acesso de hosts externos (Docker/reverse proxy)
    allowedHosts: [
      'localhost',
      'dashboard.incubadora.app.br',
      'frontend',  // nome do container na rede Docker
    ],
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: [
      'localhost',
      'dashboard.incubadora.app.br',
      'frontend',
    ],
  },
})
