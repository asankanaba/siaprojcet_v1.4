import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
      'glory-sulphuric-consonant.ngrok-free.dev',
      'localhost',
      '127.0.0.1',
      '192.168.12.3'
    ],
    proxy: {
      '/api': {
        target: 'http://192.168.12.3:80/smart-pos-api',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  }
})