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
</script>

<template>
  <!-- Splash screen -->
  <Transition name="splash">
    <div
      v-if="isLoading"
      class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-gray-950"
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
      <p class="text-sm text-gray-400 mt-1">Cargando datos...</p>
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
