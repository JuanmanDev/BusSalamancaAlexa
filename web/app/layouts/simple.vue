<script setup lang="ts">
const router = useRouter()

const handleBack = () => {
  if (window.history.state && window.history.state.back) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
    <header class="w-full h-16 flex items-center px-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-50">
      <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" @click="handleBack" />
    </header>
    <main class="flex-1 w-full relative max-w-2xl mx-auto md:px-4">
      <slot />
    </main>
  </div>
</template>
