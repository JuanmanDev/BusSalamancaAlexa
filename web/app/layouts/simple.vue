<script setup lang="ts">
const router = useRouter()

const handleBack = () => {
  // If we have history, we might want to go back, but Nuxt i18n locale switching 
  // messes with history state by adding history entries when changing language.
  // The safest cross-language behavior for a simple layout (mostly used for Settings/Help)
  // is to just navigate to home explicitly, to avoid history loops with language prefixes.
  router.push(useLocalePath()('/'))
}
</script>

<template>
  <div class="min-h-[100dvh] flex flex-col bg-gray-50 dark:bg-gray-950">
    <header class="w-full h-16 flex items-center px-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-50">
      <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" @click="handleBack" />
    </header>
    <main class="flex-1 w-full relative max-w-2xl mx-auto md:px-4">
      <slot />
    </main>
  </div>
</template>
