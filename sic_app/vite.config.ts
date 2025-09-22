import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'public/assets/**/*',
          dest: 'assets'
        }
      ]
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    hmr: {
      overlay: false,
    },
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**'],
    },
    // Disable CSP for development
    // headers: {
    //   'Content-Security-Policy': "..."
    // }
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 500,
    target: 'es2022',
    minify: 'esbuild',
    sourcemap: process.env.NODE_ENV === 'development',
    reportCompressedSize: true,
    cssMinify: true,
    assetsInlineLimit: 4096 // 4kb
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
