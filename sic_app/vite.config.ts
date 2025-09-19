import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { VitePWA } from 'vite-plugin-pwa'

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
    }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
              }
            }
          }
        ]
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'DueSpark - Smart Invoice Reminders',
        short_name: 'DueSpark',
        description: 'AI-powered invoice reminder automation for freelancers and small businesses',
        theme_color: '#0ea5e9',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
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
    assetsInlineLimit: 4096 // 4kb
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})