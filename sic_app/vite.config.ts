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
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React ecosystem
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'react-vendor'
          }

          // Data management
          if (id.includes('@tanstack/react-query') || id.includes('axios')) {
            return 'data-vendor'
          }

          // Form utilities
          if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) {
            return 'form-vendor'
          }

          // UI libraries
          if (id.includes('lucide-react') || id.includes('@headlessui') || id.includes('react-hot-toast')) {
            return 'ui-vendor'
          }

          // Date utilities
          if (id.includes('date-fns')) {
            return 'date-vendor'
          }

          // Node modules (general)
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    },
    chunkSizeWarningLimit: 500,
    target: 'es2022',
    minify: 'esbuild',
    sourcemap: process.env.NODE_ENV === 'development',
    reportCompressedSize: true,
    cssMinify: true,
    assetsInlineLimit: 4096, // 4kb
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})