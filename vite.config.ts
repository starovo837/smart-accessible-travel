import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { handleProductApi } from './server/product-api.mjs'

export default defineConfig({
  plugins: [react(), { name: 'local-product-api', configureServer(server) { server.middlewares.use(async (req,res,next) => { if (!await handleProductApi(req,res)) next() }) } }],
  optimizeDeps: { entries: ['index.html'] },
  server: { host: '127.0.0.1', port: 5173, watch: { ignored: ['**/skylens*/**','**/Naiwa/**','**/scientific-figure/**','**/codex-migration/**','**/.studio-upload/**','**/.app-data/**','**/.local-ai/**'] } },
})
