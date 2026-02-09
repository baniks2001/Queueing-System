import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Expose to network
    port: 5174, // Use consistent port
    strictPort: true, // Don't try other ports if this is occupied
    open: false, // Don't open browser automatically
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
