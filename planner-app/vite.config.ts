import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Honey & Silk Planner',
        short_name: 'Honey & Silk',
        description: 'Digital Honey & Silk planner with pen tools',
        theme_color: '#4a3428',
        background_color: '#f3ebe1',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,svg,png,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /\/pages\/.*\.jpg$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'planner-pages',
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/planner\.json$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'planner-manifest',
            },
          },
        ],
      },
    }),
  ],
})
