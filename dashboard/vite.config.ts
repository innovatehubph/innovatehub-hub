import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          parse: ['parse'],
          router: ['react-router-dom'],
          icons: ['lucide-react'],
        },
      },
    },
  },
})
