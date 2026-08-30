import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['cross.svg'],
      workbox: {
        // Precache the app shell and all lectionary data; the 15 MB PDF is
        // fetched on demand and then cached at runtime.
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        globIgnores: ['**/metsafe-gitsawe.pdf'],
        runtimeCaching: [
          {
            urlPattern: /\/metsafe-gitsawe\.pdf$/,
            handler: 'CacheFirst',
            options: { cacheName: 'gitsawe-pdf', expiration: { maxEntries: 1 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'gitsawe-fonts', expiration: { maxEntries: 20 } },
          },
        ],
      },
      manifest: {
        name: 'ግጻዌ · Gitsawe — EOTC Lectionary',
        short_name: 'Gitsawe',
        description: 'Daily and Sunday readings of the Ethiopian Orthodox Tewahedo Church.',
        theme_color: '#92251b',
        background_color: '#f4ecdb',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
