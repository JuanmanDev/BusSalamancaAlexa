import pkg from './package.json'

// https://nuxt.com/docs/api/configuration/nuxt-config
// Stamped when the app is built, which is when the static pages last changed.
const BUILD_DATE = new Date().toISOString()

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
    '@nuxtjs/i18n',
    '@nuxtjs/sitemap',
    '@nuxtjs/robots',
    'nuxt-umami'
  ],

  // ===== SEO =====
  // Public site config shared by @nuxtjs/sitemap, @nuxtjs/robots and the canonical/og tags.
  // Override with NUXT_SITE_URL / NUXT_SITE_INDEXABLE on staging deployments.
  site: {
    url: process.env.NUXT_SITE_URL || 'https://bussalamanca.juanman.tech',
    name: 'Bus Salamanca',
    description: 'Consulta en tiempo real cuándo llega el autobús a tu parada en Salamanca',
    defaultLocale: 'es',
    indexable: process.env.NUXT_SITE_INDEXABLE !== 'false',
  },

  sitemap: {
    // Static pages come from the router; dynamic stop/line pages from this endpoint (per locale)
    sources: ['/api/__sitemap__/urls'],
    exclude: ['/settings', '/notifications', '/route/results', '/**/settings', '/**/notifications', '/**/route/results'],
    // Static pages change when the app is rebuilt, so the build date is their honest lastmod.
    // Stop and line URLs carry their own, from the last time that stop's content actually
    // changed — see server/api/__sitemap__/urls.get.ts.
    defaults: { changefreq: 'daily', priority: 0.7, lastmod: BUILD_DATE },
  },

  robots: {
    disallow: ['/api/', '/settings', '/notifications', '/route/results'],
  },

  i18n: {
    strategy: 'prefix_and_default',
    // Salamanca is a Spanish city → Spanish is what people search for. `/` serves Spanish,
    // every other language keeps its prefix. Browser language detection still redirects on `/`.
    defaultLocale: 'es',
    baseUrl: process.env.NUXT_SITE_URL || 'https://bussalamanca.juanman.tech',
    lazy: true,
    restructureDir: ".",
    langDir: 'app/i18n/locales/',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      fallbackLocale: 'es',
    },
    locales: [
      { code: 'es', language: 'es-ES', file: 'es.json', name: 'Español' },
      { code: 'en', language: 'en-US', file: 'en.json', name: 'English' },
      { code: 'it', language: 'it-IT', file: 'it.json', name: 'Italiano' },
      { code: 'fr', language: 'fr-FR', file: 'fr.json', name: 'Français' },
      { code: 'pt', language: 'pt-PT', file: 'pt.json', name: 'Português' },
      { code: 'de', language: 'de-DE', file: 'de.json', name: 'Deutsch' },
      { code: 'zh', language: 'zh-CN', file: 'zh.json', name: '中文 (Mandarin)' },
      { code: 'ja', language: 'ja-JP', file: 'ja.json', name: '日本語' },
      { code: 'ko', language: 'ko-KR', file: 'ko.json', name: '한국어' },
      { code: 'nl', language: 'nl-NL', file: 'nl.json', name: 'Nederlands' },
      { code: 'pl', language: 'pl-PL', file: 'pl.json', name: 'Polski' },
      { code: 'ro', language: 'ro-RO', file: 'ro.json', name: 'Română' },
      { code: 'ar', language: 'ar', file: 'ar.json', name: 'العربية', dir: 'rtl' }
    ]
  },

  umami: {
    host: process.env.NUXT_UMAMI_HOST || 'https://umami.juanman.tech/',
    id: process.env.NUXT_UMAMI_ID || '26610ee2-4a1e-4dac-977a-86ae1a261bf4',
    autoTrack: true,
    ignoreLocalhost: true,
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Bus Salamanca',
      short_name: 'BusSalamanca',
      description: 'Autobuses urbanos de Salamanca en tiempo real',
      lang: 'es',
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
        { name: 'viewport', content: 'width=device-width, initial-scale=1, interactive-widget=resizes-content' },
        { name: 'theme-color', content: '#1e40af' },
        ...(process.env.NUXT_PUBLIC_GSC_VERIFICATION ? [{ name: 'google-site-verification', content: process.env.NUXT_PUBLIC_GSC_VERIFICATION }] : []),
        ...(process.env.NUXT_PUBLIC_BING_VERIFICATION ? [{ name: 'msvalidate.01', content: process.env.NUXT_PUBLIC_BING_VERIFICATION }] : []),
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'alternate icon', href: '/favicon.ico' },
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

  // No prerendering. Every page here is driven by the live stop and line catalogue, and
  // prerendering baked whatever SIRI happened to be serving at build time into static files:
  // the sitemaps were written to .output/public/__sitemap__/*.xml with 12 URLs instead of ~390
  // because the build ran while SIRI was returning an empty catalogue, and they stayed that way
  // until the next deploy. Rendering per request costs little and is always current.
  nitro: {}
})
