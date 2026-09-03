import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Take the port from the environment when one is assigned, so the dev server
  // lands where a harness or container expects it instead of hunting upward.
  server: { port: Number(process.env.PORT) || 5173 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['cross.svg'],
      workbox: {
        // Precache the app shell and all lectionary data; the 15 MB PDF is
        // fetched on demand and then cached at runtime.
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        globIgnores: ['**/metsafe-gitsawe.pdf', '**/audio/*.mp3'],
        runtimeCaching: [
          {
            urlPattern: /\/metsafe-gitsawe\.pdf$/,
            handler: 'CacheFirst',
            options: { cacheName: 'gitsawe-pdf', expiration: { maxEntries: 1 } },
          },
          {
            // The converted Nehase/Pagumen recordings. Kept out of the
            // precache — 12 MB nobody has asked for yet — but held once played,
            // so a deacon who studied one keeps it offline.
            urlPattern: /\/audio\/.*\.mp3$/,
            handler: 'CacheFirst',
            options: { cacheName: 'gitsawe-audio', expiration: { maxEntries: 40 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'gitsawe-fonts', expiration: { maxEntries: 20 } },
          },
        ],
      },
      manifest: {
        name: 'Gitsawe Finder · ግጻዌ',
        short_name: 'Gitsawe Finder',
        description: 'Daily and Sunday readings of the Ethiopian Orthodox Tewahedo Church.',
        theme_color: '#a3312b',
        background_color: '#ffffff',
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
