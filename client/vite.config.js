import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Lets every file import as "@/components/..." instead of a chain of
    // "../../../" — shadcn's generated components rely on this alias.
    alias: { '@': path.resolve(dirname, './src') },
  },
  server: {
    port: 5173,
    // Forward /api/* to Express so the browser only ever talks to one origin.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
