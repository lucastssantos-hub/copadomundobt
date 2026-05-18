import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Copa do Mundo de Beach Tennis',
        short_name: 'BT World Cup',
        description: 'Sistema de controle do Circuito de Equipes',
        theme_color: '#2563eb',
        background_color: '#f1f5f9',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/copadomundobt/',
        scope: '/copadomundobt/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'firestore-cache', networkTimeoutSeconds: 10 },
          },
        ],
      },
    }),
  ],
  base: '/copadomundobt/',
})
