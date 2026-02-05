<script setup lang="ts">
const route = useRoute()
const searchQuery = ref('')
const mapStore = useMapStore()
const colorMode = useColorMode()

// Navigation items
const navItems = [
  { to: '/', icon: 'i-lucide-home', label: 'Inicio' },
  { to: '/lines', icon: 'i-lucide-list', label: 'Líneas' },
  { to: '/stops', icon: 'i-lucide-map-pin', label: 'Paradas' },
  { to: '/map', icon: 'i-lucide-map', label: 'Mapa' },
]

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

// Check if on fullscreen map page
const isMapPage = computed(() => route.path === '/map')

// Calculate visibility for the main transition
const showMainContent = computed(() => !(mapStore.isFullscreen && !isMapPage.value))
</script>

<template>
  <div class="min-h-screen flex flex-col relative">
    <!-- Background Map Layer (behind everything) -->
    <div class="fixed inset-0 z-0">
      <ClientOnly>
        <BaseMap
          :center="mapStore.center"
          :zoom="mapStore.zoom"
          :interactive="mapStore.isInteractive"
          :show-controls="mapStore.showControls"
          :stops="mapStore.stops"
          :vehicles="mapStore.vehicles"
          :highlight-line-id="mapStore.highlightLineId ?? undefined"
          :highlight-vehicle-id="mapStore.highlightVehicleId ?? undefined"
          :padding="mapStore.padding"
          @map-ready="(map: any) => mapStore.mapInstance = markRaw(map)"
          @vehicle-click="(vehicle: any) => mapStore.followVehicle(vehicle)"
        />
      </ClientOnly>
    </div>

    <!-- Header with blur (on top of map) -->
    <header class="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-white/10 shadow-sm transition-all duration-300">
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <!-- Logo -->
        <NuxtLink 
          to="/" 
          class="flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:opacity-90 transition-opacity shrink-0"
        >
          <UIcon name="i-lucide-bus" class="w-7 h-7" />
          <span class="text-xl font-bold hidden sm:inline text-gray-900 dark:text-white">Bus Salamanca</span>
        </NuxtLink>

        <!-- Desktop nav -->
        <nav class="hidden md:flex items-center gap-1">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all"
            :class="{ 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400': isActive(item.to) }"
          >
            <UIcon :name="item.icon" class="w-5 h-5" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <GlobalSearch v-model="searchQuery" />
          <button
            @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
            class="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <UIcon :name="colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'" class="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>

    <!-- Main content area -->
    <Transition name="main-slide">
      <main 
        v-show="showMainContent"
        class="relative z-10 flex-1 pt-16 pb-20 md:pb-8"
        :class="isMapPage || mapStore.isFullscreen ? 'pointer-events-none' : ''"
      >
        <!-- Content wrapper - allows map to show in gaps -->
        <div>
          <slot />
        </div>
      </main>
    </Transition>

    <!-- Fullscreen map controls - separate from main content to stay visible -->
    <Transition name="fade-slide-up">
      <div
        v-if="mapStore.isFullscreen && !isMapPage"
        class="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
      >
        <button
          class="glass-card px-6 py-3 flex items-center gap-2 hover:scale-105 transition-transform shadow-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
          @click="mapStore.setFullscreen(false)"
        >
          <UIcon name="i-lucide-arrow-down" class="w-5 h-5" />
          <span class="font-bold">Volver</span>
        </button>
      </div>
    </Transition>

    <!-- Mobile bottom nav with blur -->
    <nav 
      v-if="!mapStore.isFullscreen"
      class="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]"
    >
      <div class="flex items-center justify-around py-2">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all"
          :class="isActive(item.to)
            ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'"
        >
          <UIcon :name="item.icon" class="w-6 h-6" />
          <span class="text-xs font-medium">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>

<style>
@reference "tailwindcss";

/* Glass card utility */
.glass-card {
  background: rgb(255 255 255 / 0.9);
  backdrop-filter: blur(12px);
  border-radius: 0.75rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}

.dark .glass-card {
  background: rgb(17 24 39 / 0.9);
}

/* View Transitions */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.3s;
}

/* Page transitions */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Fade Slide Up transition */
.fade-slide-up-enter-active,
.fade-slide-up-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-up-enter-from,
.fade-slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 100%);
}

/* Main Slide Transition */
.main-slide-enter-active,
.main-slide-leave-active {
  transition: transform 0.5s ease-in-out;
}

.main-slide-enter-from,
.main-slide-leave-to {
  transform: translateY(100vh);
}
</style>
