import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      process: "process/browser",
      stream: "stream-browserify",
      zlib: "browserify-zlib",
      util: "util",
      events: "events",
    },
  },
  optimizeDeps: {
    include: ['util', 'events', 'stream-browserify', 'process', 'browserify-zlib'],
  },
  define: {
    global: 'window',
    'process.env': {},
  },
})
