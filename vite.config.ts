import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// En développement :
//  - /api   -> le petit serveur Node (npm run dev le lance aussi)
//  - /carte -> la carte BlueMap (serveur de test sur ton PC, port 8099)
// En production, c'est Caddy qui fait ce travail.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/carte': 'http://localhost:8099',
    },
  },
})
