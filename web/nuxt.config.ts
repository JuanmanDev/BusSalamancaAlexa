// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  telemetry: false,

  modules: [
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@nuxt/icon',
    '@pinia/nuxt',
  ],

  css: ['~/assets/css/main.css'],

  app: {
    buildAssetsDir: '/_nuxt/',
    head: {
      title: 'Bus Salamanca',
      meta: [
        { name: 'description', content: 'Consulta tiempos de autobuses en Salamanca en tiempo real' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' },
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
})
