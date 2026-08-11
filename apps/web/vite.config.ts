import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // serve relative paths when previewing static files
  build: {
    outDir: '../dist/web'
  }
})
