import { defineConfig } from 'vite'
import path from "path"
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// Import the polyfill plugin
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // This plugin automatically polyfills 'events', 'util', 'stream', etc.
    nodePolyfills({
      protocolImports: true, // polyfills 'node:events', etc.
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // You can remove "events": "events" because the plugin handles it now
    },
  },
  define: {
    // Knex often needs global defined
    global: 'window',
  }
})