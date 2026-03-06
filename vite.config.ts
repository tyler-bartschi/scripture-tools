import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { registerApiRoutes } from './server/api'

const databasePlugin = () => ({
  name: 'vite:scripture-database',
  configureServer(server) {
    registerApiRoutes(server.middlewares)
  },
  configurePreviewServer(server) {
    registerApiRoutes(server.middlewares)
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), databasePlugin()],
})
