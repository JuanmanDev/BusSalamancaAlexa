<script setup lang="ts">
/**
 * Sponsor / donation links. Same links as .github/FUNDING.yml and the README badges.
 */
const LINKS = [
  { id: 'github', href: 'https://github.com/sponsors/JuanmanDev', icon: 'i-lucide-heart', color: 'primary' as const },
  { id: 'kofi', href: 'https://ko-fi.com/juanmandev', icon: 'i-lucide-coffee', color: 'neutral' as const },
  { id: 'paypal', href: 'https://paypal.me/juanmandev', icon: 'i-lucide-hand-coins', color: 'neutral' as const },
]
</script>

<template>
  <section class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
    <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
      <UIcon name="i-lucide-heart-handshake" class="w-5 h-5 text-pink-500" />
      {{ $t('support.title') }}
    </h2>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{{ $t('support.desc') }}</p>
    <div class="flex flex-col sm:flex-row flex-wrap gap-2">
      <UButton
        v-for="link in LINKS"
        :key="link.id"
        :to="link.href"
        target="_blank"
        rel="noopener sponsored"
        :color="link.color"
        :variant="link.id === 'github' ? 'soft' : 'outline'"
        :icon="link.icon"
        class="justify-center sm:justify-start"
        v-track-click="{ id: 'support_link', data: { provider: link.id } }"
      >
        {{ $t(`support.${link.id}`) }}
      </UButton>
    </div>
  </section>
</template>
