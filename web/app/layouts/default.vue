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
  { to: '/route', icon: 'i-lucide-waypoints', label: 'Ruta' },
]

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

// Check if on fullscreen map page or route page (which keeps map bg)
const isMapPage = computed(() => {
  return route.path === '/map' // Only the main map page keeps content? Actually if map page has overlays we might want to hide them too?
  // User said: "on pages like lines id or stops id... content... stays visible although it shouldn't"
  // So likely ONLY '/map' is truly a map page where fullscreen logic might differ, or maybe NO page should be exempt?
  // But let's stick to user request: line/ and stop/ should NOT be considered map pages for this purpose.
})

// Hide main content (and default padding) when map is fullscreen
// UNLESS we are currently animating out of fullscreen (isExitingFullscreen)
const showMainContent = computed(() => {
  if (mapStore.isExitingFullscreen) return true
  // If isMapPage is false (line/stop), then !(true && !false) -> !(true) -> false (HIDDEN)
  return !(mapStore.isFullscreen && !isMapPage.value)
})

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
          @vehicle-click="(vehicle: any) => mapStore.vehicleClick(vehicle)"
        />
      </ClientOnly>
    </div>

    <Transition name="header-slide">
      <header 
        v-show="showMainContent"
        class="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm"
      >
      <div class="container mx-auto px-4 h-16 flex items-center justify-between">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2 font-bold text-xl text-primary-600 dark:text-primary-400">
          <UIcon name="i-lucide-bus" class="w-8 h-8" />
          <span>BusSalamanca</span>
        </NuxtLink>

        <!-- Desktop Nav -->
        <nav class="hidden md:flex items-center gap-6">
          <NuxtLink 
            v-for="item in navItems" 
            :key="item.to" 
            :to="item.to"
            class="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
            :class="isActive(item.to) 
              ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 font-medium' 
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'"
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
    </Transition>

    <!-- Main content area -->
      <main 
        class="relative z-10 flex flex-col flex-1 pointer-events-none transition-all duration-500 ease-in-out"
        :class="{
          'pt-16 pb-20 md:pb-0 opacity-100 translate-y-0 visible': showMainContent,
          'pt-0 pb-0 h-screen opacity-0 translate-y-4 invisible overflow-hidden': !showMainContent
        }"
      >
        <!-- Content wrapper - allows map to show in gaps -->
        <slot />
      </main>

    <!-- Fallback MapPreview for pages without their own (e.g., lines, stops lists) -->
    <!-- Provides fullscreen controls (exit button, zoom, location) when no page-level MapPreview exists -->
    <MapPreview v-if="mapStore.isFullscreen && !mapStore.hasPageMapPreview" :is-fallback="true" />

    <!-- Mobile bottom nav with blur -->
    <Transition name="nav-slide">
      <nav 
        v-show="showMainContent"
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
    </Transition>

    <!-- <div class="fixed bottom-0 right-0 z-50">
      paddings {{ mapStore.padding }}
      rotation {{ mapStore.rotation }}
      3d {{ mapStore.pitch }}
    </div> -->
  </div>
</template>

<style>
@reference "tailwindcss";

html {
  overflow-y: scroll;
}

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

/* Header Slide Transition */
.header-slide-enter-active,
.header-slide-leave-active {
  transition: transform 0.5s ease-in-out;
}

.header-slide-enter-from,
.header-slide-leave-to {
  transform: translateY(-100%);
}

/* Nav Slide Transition */
.nav-slide-enter-active,
.nav-slide-leave-active {
  transition: transform 0.5s ease-in-out;
}

.nav-slide-enter-from,
.nav-slide-leave-to {
  transform: translateY(100%);
}
</style>
