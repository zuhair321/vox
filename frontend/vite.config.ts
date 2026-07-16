import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  // Relative base so the built assets load correctly when the app is opened
  // from inside app.asar via loadFile (absolute "/assets/..." paths would
  // resolve to the filesystem root and 404 -> white screen).
  base: './',
  plugins: [
    react(),
    // Bundle analysis plugin - only enabled when explicitly requested
    ...(process.env.ANALYZE === 'true' ? [
      visualizer({
        filename: './stats.html', // Analyze output file
        open: true, // Open in browser if possible
        gzipSize: true,
        brotliSize: true
      })
    ] : []),
  ],
  server: {
    port: 3000,
    strictPort: true,
    host: '127.0.0.1'
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          motion: ['framer-motion'],
          socket: ['socket.io-client'],
          router: ['react-router-dom'],
          store: ['zustand'],
          ui: ['lucide-react'],
          utils: ['date-fns', 'd3-force']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'framer-motion', 'lucide-react']
  }
})