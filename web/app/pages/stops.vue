<script setup lang="ts">
useSeoMeta({
  title: 'Todas las paradas - Bus Salamanca',
  description: 'Listado de todas las paradas de autobús de Salamanca',
})

const router = useRouter()
const storage = useStorage()
const geolocation = useGeolocation()
const busService = useBusService()
const mapStore = useMapStore()

// Search and filters
const searchQuery = ref('')
const showNearby = ref(true)

// Load stops
const { data: allStops, status } = await useAsyncData(
  'all-stops',
  () => busService.fetchStops(),
  { server: true }
)

const isLoading = computed(() => status.value === 'pending')

// Filtered and sorted stops
const filteredStops = computed(() => {
  if (!allStops.value) return []
  
  let stops = [...allStops.value]
  
  // Filter by search
  const query = searchQuery.value.toLowerCase().trim()
  if (query) {
    stops = stops.filter(s => 
      s.name.toLowerCase().includes(query) || 
      s.id.includes(query)
    )
  }

  // Sort by distance if nearby mode and has location
  if (showNearby.value && geolocation.userLocation.value) {
    stops = stops
      .map(s => ({
        ...s,
        distance: geolocation.getDistanceToStop(s)
      }))
      .filter(s => s.distance !== null && s.distance < 2) // Within 2km
      .sort((a, b) => (a.distance || 0) - (b.distance || 0))
  } else {
    // Sort numerically by ID
    stops = stops.sort((a, b) => parseInt(a.id) - parseInt(b.id))
  }

  return stops
})

function goToStop(stop: { id: string; name: string }) {
  storage.addRecent('stop', stop.id, stop.name)
  router.push(`/stop/${stop.id}`)
}

function toggleFavorite(stop: { id: string; name: string }) {
  storage.toggleFavorite('stop', stop.id, stop.name)
}

// Update map with stops
// watch([filteredStops, allStops], () => {
//   if (filteredStops.value.length > 0) {
//     mapStore.showAllStops(filteredStops.value.slice(0, 50))
//   } else if (allStops.value) {
//     mapStore.showAllStops(allStops.value.slice(0, 50))
//   }
// }, { immediate: true })

// Request location on mount if nearby mode
onMounted(() => {
  if (showNearby.value) {
    geolocation.requestLocation()
  }
})

// Center map on user location when available and nearby mode is active
// watch(() => geolocation.userLocation.value, (loc) => {
//   if (loc && showNearby.value) {
//     mapStore.updatePosition(
//         [{ lng: loc.lng, lat: loc.lat }],
//         { zoom: 16, type: 'user' }
//     )
//   }
// }, { immediate: true })

// // Also watch showNearby to re-center if toggled on and we have location
// watch(showNearby, (enabled) => {
//   if (enabled && geolocation.userLocation.value) {
//     const loc = geolocation.userLocation.value
//     mapStore.updatePosition(
//         [{ lng: loc.lng, lat: loc.lat }],
//         { zoom: 16, type: 'user' }
//     )
//   }
// })

onUnmounted(() => {
  // mapStore.reset()
  // mapStore.reset()
  mapStore.setFullscreen(false);
  // mapStore.vehicles = []

})
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-4">
    <!-- Header -->
    <div class="glass-card p-5">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        Paradas de autobús
      </h1>
      <p class="text-gray-500 dark:text-gray-400">
        {{ allStops?.length || 0 }} paradas disponibles
      </p>
    </div>

    <!-- Search and filters -->
    <div class="glass-card p-4 space-y-3">
      <SearchInput
        v-model="searchQuery"
        placeholder="Buscar por número o nombre..."
      />
      
      <!-- Nearby toggle -->
      <div 
        v-if="!searchQuery"
        class="flex items-center justify-between bg-white/50 dark:bg-gray-800/50 rounded-lg p-3"
      >
        <div class="flex items-center gap-2">
          <UIcon 
            name="i-lucide-navigation" 
            class="w-5 h-5"
            :class="geolocation.isLocating.value ? 'animate-spin text-primary-500' : 'text-gray-400'"
          />
          <span class="text-sm text-gray-700 dark:text-gray-300">
            Ordenar por cercanía
          </span>
        </div>
        <USwitch 
          v-model="showNearby"
          :loading="geolocation.isLocating.value"
          @update:model-value="(v: boolean) => v && geolocation.requestLocation()"
        />
      </div>
    </div>

    <!-- Stops list -->
    <div class="glass-card p-4">
      <BusStops
        :stops="filteredStops"
        :loading="isLoading"
        :show-favorite="true"
        :show-distance="showNearby && !!geolocation.userLocation.value"
        :show-lines="true"
        @select="goToStop"
        @toggle-favorite="toggleFavorite"
      />

      <!-- Empty state for nearby -->
      <div 
        v-if="!isLoading && showNearby && filteredStops.length === 0 && !searchQuery"
        class="text-center py-8 text-gray-500"
      >
        <UIcon name="i-lucide-map-pin-off" class="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p>No hay paradas cercanas</p>
        <p class="text-sm mt-1">Prueba desactivando el filtro de cercanía</p>
      </div>
    </div>
  </div>
</template>
