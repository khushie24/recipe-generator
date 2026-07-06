import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Capacitor serves the built app from the filesystem (webDir: 'dist'),
// so we use relative asset paths — otherwise assets 404 inside the APK.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: true, // lets you test on a phone over LAN during `npm run dev`
    port: 5173
  }
})
