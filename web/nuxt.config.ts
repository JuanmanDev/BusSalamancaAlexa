import pkg from './package.json'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  telemetry: false,

  runtimeConfig: {
    public: {
      version: pkg.version
    }
  },

  modules: [
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@nuxt/icon',
    '@pinia/nuxt',
    '@vite-pwa/nuxt',
    '@nuxtjs/i18n'
  ],

  i18n: {
    strategy: 'prefix_and_default',
    defaultLocale: 'en',
    lazy: true,
    restructureDir: ".",
    langDir: 'app/i18n/locales/',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      fallbackLocale: 'en',
    },
    locales: [
      { code: 'es', file: 'es.json', name: 'Español' },
      { code: 'en', file: 'en.json', name: 'English' },
      { code: 'it', file: 'it.json', name: 'Italiano' },
      { code: 'fr', file: 'fr.json', name: 'Français' },
      { code: 'pt', file: 'pt.json', name: 'Português' },
      { code: 'de', file: 'de.json', name: 'Deutsch' },
      { code: 'zh', file: 'zh.json', name: '中文 (Mandarin)' },
      { code: 'ja', file: 'ja.json', name: '日本語' },
      { code: 'ko', file: 'ko.json', name: '한국어' },
      { code: 'nl', file: 'nl.json', name: 'Nederlands' },
      { code: 'pl', file: 'pl.json', name: 'Polski' },
      { code: 'ro', file: 'ro.json', name: 'Română' },
      { code: 'ar', file: 'ar.json', name: 'العربية', dir: 'rtl' }
    ]
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Bus Salamanca',
      short_name: 'BusSalamanca',
      theme_color: '#1e40af',
      background_color: '#ffffff',
      display: 'standalone',
      icons: [
        {
          src: '/favicon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any maskable'
        }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      runtimeCaching: [
        {
          urlPattern: /^\/api\/bus\/stops.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'api-stops-cache',
            expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 1 week
            cacheableResponse: { statuses: [0, 200] }
          }
        },
        {
          urlPattern: /^\/api\/bus\/lines.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'api-lines-cache',
            expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 7 },
            cacheableResponse: { statuses: [0, 200] }
          }
        },
        {
          urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'osm-tiles-cache',
            expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 days
            cacheableResponse: { statuses: [0, 200] }
          }
        }
      ]
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
  },

  css: ['~/assets/css/main.css'],

  app: {
    buildAssetsDir: '/_nuxt/',
    head: {
      title: 'Bus Salamanca',
      meta: [
        { name: 'description', content: 'Consulta tiempos de autobuses en Salamanca en tiempo real' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, interactive-widget=resizes-content' },
        { name: 'theme-color', content: '#1e40af' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' },
    viewTransition: true,
  },

  // Alias to use the siri service from root
  alias: {
    '@siri': '../siri',
  },

  ssr: true,
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/']
    }
  }
})
