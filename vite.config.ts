/// <reference types="vitest/config" />

import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    test: {
      environment: 'jsdom',
      setupFiles: './vitest.setup.ts',
      globals: true,
      exclude: ['**/node_modules/**', '**/dist/**', 'functions/lib/**'],
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['app-icon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: '/',
          name: 'HomeWork',
          short_name: 'HomeWork',
          description: 'Enterprise family homework and allowance manager.',
          start_url: '/',
          display: 'standalone',
          background_color: '#0a0a0a',
          theme_color: '#b30000',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          maximumFileSizeToCacheInBytes: 5000000, // 5MB limit for large mockup images
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,webp}'],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === 'document',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'pages-cache',
              },
            },
            {
              urlPattern: ({ request }) => request.destination === 'script' || request.destination === 'style',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'assets-cache',
              },
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
