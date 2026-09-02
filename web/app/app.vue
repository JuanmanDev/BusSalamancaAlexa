<script setup lang="ts">
const isLoading = ref(true)

onMounted(() => {
  // Fade out quickly after initial mount
  window.addEventListener('load', () => {
    setTimeout(() => { isLoading.value = false }, 300)
  })
  // Fallback: always hide after 1.5s max
  setTimeout(() => { isLoading.value = false }, 1500)
})

// ===== SEO =====
// <html lang/dir>, canonical + hreflang alternates for every locale (from @nuxtjs/i18n)
const i18nHead = useLocaleHead({ dir: true, lang: true, seo: true })
const { t, locale } = useI18n()
const config = useRuntimeConfig()
const siteUrl = (config.public.site as { url?: string } | undefined)?.url ?? 'https://bussalamanca.juanman.tech'
const route = useRoute()
const switchLocalePath = useSwitchLocalePath()

// Canonical: same page in the current locale, WITHOUT the redundant default-locale prefix
// (`/es/stops` and `/stops` both exist with `prefix_and_default`; `/stops` is canonical) and without query.
const canonicalUrl = computed(() => {
  const path = switchLocalePath(locale.value as any) || route.path
  const clean = path.split('?')[0]!.replace(/\/+$/, '')
  return `${siteUrl}${clean || '/'}`.replace(/([^:])\/\//g, '$1/')
})

useHead({
  htmlAttrs: computed(() => i18nHead.value.htmlAttrs ?? {}),
  link: computed(() => [
    ...(i18nHead.value.link ?? []).filter((l: any) => l.rel !== 'canonical'),
    { rel: 'canonical', href: canonicalUrl.value },
  ]),
  meta: computed(() => i18nHead.value.meta ?? []),
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${siteUrl}/#website`,
            url: siteUrl,
            name: 'Bus Salamanca',
            description: t('seo.description'),
            inLanguage: locale.value,
            publisher: { '@id': `${siteUrl}/#person` },
          },
          {
            '@type': 'WebApplication',
            '@id': `${siteUrl}/#app`,
            name: 'Bus Salamanca',
            url: siteUrl,
            applicationCategory: 'TravelApplication',
            operatingSystem: 'Any',
            browserRequirements: 'Requires JavaScript',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
            description: t('seo.description'),
            image: `${siteUrl}/og-image.jpg`,
            areaServed: { '@type': 'City', name: 'Salamanca', address: { '@type': 'PostalAddress', addressLocality: 'Salamanca', addressCountry: 'ES' } },
          },
          {
            '@type': 'Person',
            '@id': `${siteUrl}/#person`,
            name: 'Juan Manuel Bécares',
            url: 'https://juanman.tech/',
            sameAs: ['https://github.com/JuanmanDev'],
          },
        ],
      })),
    },
  ],
})

// Default Open Graph / Twitter tags. Pages override title/description via useSeoMeta.
useSeoMeta({
  ogType: 'website',
  ogSiteName: 'Bus Salamanca',
  ogLocale: computed(() => i18nHead.value.meta?.find((m: any) => m.property === 'og:locale')?.content ?? locale.value),
  ogImage: `${siteUrl}/og-image.jpg`,
  ogImageWidth: 1280,
  ogImageHeight: 800,
  ogImageAlt: 'Bus Salamanca',
  twitterCard: 'summary_large_image',
  twitterImage: `${siteUrl}/og-image.jpg`,
  // Sensible defaults if a page forgets to set them
  title: computed(() => t('seo.title')),
  description: computed(() => t('seo.description')),
  ogTitle: computed(() => t('seo.title')),
  ogDescription: computed(() => t('seo.description')),
  ogUrl: canonicalUrl,
  robots: 'index, follow, max-image-preview:large',
})
</script>

<template>
  <!-- Splash screen -->
  <Transition name="splash">
    <div
      v-if="isLoading"
      class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-gray-950"
      aria-hidden="true"
    >
      <div class="relative flex items-center justify-center w-24 h-24 mb-6">
        <!-- Spinning ring -->
        <svg class="absolute inset-0 w-full h-full animate-spin" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="48" cy="48" r="42" stroke="currentColor" stroke-width="6" class="opacity-10 text-primary-500" />
          <path d="M48 6 A42 42 0 0 1 90 48" stroke="currentColor" stroke-width="6" stroke-linecap="round" class="text-primary-500" />
        </svg>
        <!-- Bus icon in the center -->
        <UIcon name="i-lucide-bus" class="w-10 h-10 text-primary-500 relative z-10" />
      </div>
      <p class="text-xl font-bold text-gray-800 dark:text-white tracking-tight">BusSalamanca</p>
      <p class="text-sm text-gray-400 mt-1">{{ $t('general.loading') }}...</p>
    </div>
  </Transition>

  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<style>
.splash-enter-active,
.splash-leave-active {
  transition: opacity 0.4s ease;
}
.splash-enter-from,
.splash-leave-to {
  opacity: 0;
}
</style>
