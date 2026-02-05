<script setup lang="ts">
import type { BusArrival, BusVehicle } from '~/types/bus'

const route = useRoute()
const storage = useStorage()
const busService = useBusService()
const mapStore = useMapStore()

const stopId = computed(() => route.params.id as string)

// Load stop info from cached data
const { data: allStops } = await useAsyncData(
  'all-stops',
  () => busService.fetchStops(),
  { server: true }  
)

const stopInfo = computed(() => 
  allStops.value?.find(s => s.id === stopId.value)
)

// Set page meta
useSeoMeta({
  title: () => stopInfo.value ? `Parada ${stopInfo.value.name} - Bus Salamanca` : 'Parada - Bus Salamanca',
  description: () => `Tiempos de llegada en tiempo real para la parada ${stopInfo.value?.name || stopId.value}`,
})

// Real-time arrivals
const arrivals = ref<BusArrival[]>([])
const vehicles = ref<BusVehicle[]>([])
const loading = ref(true)
const isRefreshing = ref(false)
const error = ref<string | null>(null)
const lastUpdated = ref<Date | null>(null)

async function fetchArrivals() {
  try {
    isRefreshing.value = arrivals.value.length > 0
    loading.value = arrivals.value.length === 0
    error.value = null
    arrivals.value = await busService.fetchArrivals(stopId.value)
    
    // Extract vehicles from arrivals (since global vehicle monitoring is unstable)
    const arrivalVehicles = arrivals.value
      .filter(a => a.location && a.vehicleRef)
      .map(a => ({
        id: a.vehicleRef!,
        lineId: a.lineId,
        lineName: a.lineName,
        latitude: a.location!.latitude,
        longitude: a.location!.longitude,
        destination: a.destination
      }))

    vehicles.value = arrivalVehicles
    lastUpdated.value = new Date()
  } catch (e) {
    error.value = 'Error al cargar llegadas'
    console.error(e)
  } finally {
    loading.value = false
    isRefreshing.value = false
  }
}

// Auto-refresh every 30 seconds
let refreshInterval: ReturnType<typeof setInterval>

onMounted(() => {
  mapStore.setPagePaddingFromMapPreviewContainer();
  if (stopInfo.value) {
    storage.addRecent('stop', stopId.value, stopInfo.value.name)
    // Set stops FIRST, then focus (order matters!)
    mapStore.stops = [stopInfo.value]
    mapStore.highlightStopId = stopInfo.value.id
    mapStore.focusOnStop(stopInfo.value)
  }
  fetchArrivals()
  refreshInterval = setInterval(fetchArrivals, 30000)
})

// Update map when stop info loads (handles async data loading)
watch(stopInfo, (stop) => {
  if (stop) {
    // Set stops FIRST, then highlight and focus
    mapStore.stops = [stop]
    mapStore.highlightStopId = stop.id
    mapStore.focusOnStop(stop)
  }
}, { immediate: true })

// Watch stopId changes to clear stale data
watch(stopId, () => {
  // Clear stale vehicles immediately
  vehicles.value = []
  mapStore.vehicles = []
})

// Update vehicles on map
watch(vehicles, (v) => {
  mapStore.vehicles = v
})

onUnmounted(() => {
  clearInterval(refreshInterval)
  // Clear vehicles to prevent stale data appearing on other pages
  mapStore.vehicles = []
})

// Favorite toggle
const isFavorite = computed(() => storage.isFavorite('stop', stopId.value))

function toggleFavorite() {
  if (stopInfo.value) {
    storage.toggleFavorite('stop', stopId.value, stopInfo.value.name)
  }
}

function formatLastUpdated(): string {
  if (!lastUpdated.value) return ''
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(lastUpdated.value)
}

// Open in external maps
function openInGoogleMaps() {
  if (stopInfo.value?.latitude && stopInfo.value?.longitude) {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${stopInfo.value.latitude},${stopInfo.value.longitude}`,
      '_blank'
    )
  }
}

function openInAppleMaps() {
  if (stopInfo.value?.latitude && stopInfo.value?.longitude) {
    window.open(
      `https://maps.apple.com/?daddr=${stopInfo.value.latitude},${stopInfo.value.longitude}`,
      '_blank'
    )
  }
}

// Map Padding Logic
const mapPreviewContainer = ref<HTMLElement | null>(null)

function updateMapPadding() {
  if (mapStore.isFullscreen) {
    mapStore.setMapState({ padding: { top: 0, bottom: 0, left: 0, right: 0 } })
    return
  }

  if (!mapPreviewContainer.value) return

  const rect = mapPreviewContainer.value.getBoundingClientRect()
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  // Calculate padding to frame the map within the preview container
  // We want the "visible" map area to be exactly the container's rect
  // So we pad everything else out
  
  const padding = {
    top: rect.top,
    bottom: windowHeight - rect.bottom,
    left: rect.left,
    right: windowWidth - rect.right
  }

  mapStore.setMapState({ padding })
  
  // Re-center on stop if it exists, to ensure it's in the new center
  if (stopInfo.value && stopInfo.value.longitude && stopInfo.value.latitude) {
     mapStore.setMapState({ center: [stopInfo.value.longitude, stopInfo.value.latitude] })
  }
}

// Watch fullscreen changes
watch(() => mapStore.isFullscreen, (isFullscreen) => {
  if (isFullscreen) {
    // mapStore.setMapState({ padding: { top: 0, bottom: 0, left: 0, right: 0 } })
    // Re-center on stop when going fullscreen
    if (stopInfo.value && stopInfo.value.longitude && stopInfo.value.latitude) {
       // Small delay to allow padding to clear
       setTimeout(() => {
         // Check stopInfo again inside timeout just in case
         if (stopInfo.value && stopInfo.value.longitude && stopInfo.value.latitude) {
            mapStore.setMapState({ center: [stopInfo.value.longitude, stopInfo.value.latitude] })
         }
       }, 50)
    }
  } else {
    // Returning from fullscreen, restore padding
    // Small delay to allow transition to finish
    // setTimeout(updateMapPadding, 300)
  }
})

// // Update on mount and resize
// onMounted(() => {
//   // Initial update after a brief delay to ensure layout is settled
//   setTimeout(updateMapPadding, 100)
//   window.addEventListener('resize', updateMapPadding)
// })

onUnmounted(() => {
  // window.removeEventListener('resize', updateMapPadding)
  // mapStore.setMapState({ padding: { top: 0, bottom: 0, left: 0, right: 0 } })
})
</script>

<template>
  <div class="max-w-3xl mx-auto flex flex-col md:block">
    <!-- Map Preview (Order 1 on Mobile, 2 on Desktop handled via classes mainly but here we want content first on desktop, map first on mobile) -->
    <!-- Actually, user asked: Mobile: Map Top. Desktop: Map Bottom. -->
    <!-- Wait, typically desktop has Map on side or bottom? User said: "In case of being mobile it will appear above, and if it is tablet or desktop below". -->
    
    <!-- We will use flex-col on mobile. flex-col-reverse on desktop? No. User said: 
      Mobile: Map Top
      Desktop: Map Bottom
      
      So:
      Container: flex flex-col
      Map: order-1
      Content: order-2
      
      Wait, "if it is tablet or desktop below". So:
      Mobile: Map (Top) -> Content
      Desktop: Content -> Map (Bottom)
      
      So:
      Container: flex flex-col
      Map: md:order-last
    -->
    
    <!-- Map Preview -->
    <div ref="mapPreviewContainer" class="md:order-last mb-4 md:mb-0 md:mt-6">
       <MapPreview />
    </div>

    <!-- Content -->
    <div class="px-4 py-6 space-y-4">


    <!-- Header card -->
    <div class="glass-card p-5">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
        <NuxtLink to="/stops" class="hover:text-primary-500 transition-colors">
          Paradas
        </NuxtLink>
        <UIcon name="i-lucide-chevron-right" class="w-4 h-4" />
        <span :style="{ viewTransitionName: `stop-${stopId}` }">{{ stopId }}</span>
      </div>

      <!-- Title -->
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 
            class="text-xl font-bold text-gray-900 dark:text-white"
            :style="{ viewTransitionName: `stop-name-${stopId}` }"
          >
            {{ stopInfo?.name || `Parada ${stopId}` }}
          </h1>
          <div class="flex items-center gap-3 mt-2 text-sm text-gray-500">
            <span v-if="lastUpdated" class="flex items-center gap-1">
              <UIcon 
                name="i-lucide-refresh-cw" 
                class="w-3.5 h-3.5"
                :class="isRefreshing ? 'animate-spin' : ''"
              />
              {{ formatLastUpdated() }}
            </span>
          </div>
        </div>

        <button
          class="p-3 rounded-xl transition-all bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800"
          :class="isFavorite ? 'text-amber-500' : 'text-gray-400'"
          @click="toggleFavorite"
        >
          <UIcon 
            name="i-lucide-star"
            :class="isFavorite ? 'fill-current' : ''"
            class="w-5 h-5"
          />
        </button>
      </div>
    </div>

    <!-- Error -->
    <div 
      v-if="error"
      class="glass-card p-4 border-l-4 border-red-500"
    >
      <div class="flex items-center gap-3 text-red-600 dark:text-red-400">
        <UIcon name="i-lucide-alert-circle" class="w-5 h-5 shrink-0" />
        <span class="flex-1">{{ error }}</span>
        <UButton size="sm" variant="ghost" @click="fetchArrivals">
          Reintentar
        </UButton>
      </div>
    </div>

    <!-- Arrivals -->
    <div class="glass-card p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          Próximas llegadas
        </h2>
        <UButton
          variant="ghost"
          size="sm"
          icon="i-lucide-refresh-cw"
          :loading="loading || isRefreshing"
          @click="fetchArrivals"
        >
          Actualizar
        </UButton>
      </div>
      <BusArrivals
        :arrivals="arrivals"
        :loading="loading"
      />
    </div>

    <!-- Actions -->
    <div class="grid grid-cols-2 gap-3">
      <button
        class="glass-card p-4 hover:scale-[1.02] transition-all flex items-center gap-3"
        @click="openInGoogleMaps"
      >
        <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center shrink-0">
          <UIcon name="i-lucide-navigation" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div class="text-left">
          <p class="font-medium text-gray-900 dark:text-white text-sm">Google Maps</p>
          <p class="text-xs text-gray-500">Cómo llegar</p>
        </div>
      </button>

      <button
        class="glass-card p-4 hover:scale-[1.02] transition-all flex items-center gap-3"
        @click="openInAppleMaps"
      >
        <div class="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center shrink-0">
          <UIcon name="i-lucide-map" class="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </div>
        <div class="text-left">
          <p class="font-medium text-gray-900 dark:text-white text-sm">Apple Maps</p>
          <p class="text-xs text-gray-500">Cómo llegar</p>
        </div>
      </button>
    </div>

    </div>
  </div>
</template>
