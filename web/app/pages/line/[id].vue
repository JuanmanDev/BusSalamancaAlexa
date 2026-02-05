<script setup lang="ts">
import type { BusStop, BusVehicle, BusLine } from '~/types/bus'

const route = useRoute()
const router = useRouter()
const storage = useStorage()
const busService = useBusService()
const mapStore = useMapStore()

const lineId = computed(() => route.params.id as string)

// Load data
const { data: allLines, status: linesStatus } = await useBusLines()

const { data: allStops, status: stopsStatus } = await useBusStops()

const lineInfo = computed(() => 
  allLines.value?.find(l => l.id === lineId.value)
)

// Stops on this line - filter by stops that include this lineId
const lineStops = computed((): BusStop[] => {
  if (!allStops.value) return []
  
  const filtered = allStops.value.filter(s => {
    if (!s.lines || !Array.isArray(s.lines)) return false
    return s.lines.includes(lineId.value)
  })
  
  // Sort numerically by stop id
  return filtered.sort((a, b) => parseInt(a.id) - parseInt(b.id))
})

// Map center - average of line stops
const mapCenter = computed((): [number, number] => {
  const stops = lineStops.value.filter(s => s.latitude && s.longitude)
  if (stops.length === 0) return [-5.6635, 40.9701]
  
  const avgLng = stops.reduce((sum, s) => sum + s.longitude!, 0) / stops.length
  const avgLat = stops.reduce((sum, s) => sum + s.latitude!, 0) / stops.length
  return [avgLng, avgLat]
})

// Parse route name
function getRouteParts(name: string): { origin: string; destination: string } | null {
  const parts = name.split(' - ')
  if (parts.length >= 2 && parts[0]) {
    return {
      origin: parts[0].trim(),
      destination: parts.slice(1).join(' - ').trim()
    }
  }
  return null
}

const routeParts = computed(() => lineInfo.value ? getRouteParts(lineInfo.value.name) : null)

// Set page meta
useSeoMeta({
  title: () => lineInfo.value ? `Línea ${lineId.value} - Bus Salamanca` : `Línea ${lineId.value}`,
  description: () => `Información de la línea ${lineId.value} de autobús de Salamanca`,
})

// Favorite toggle
const isFavorite = computed(() => storage.isFavorite('line', lineId.value))

function toggleFavorite() {
  if (lineInfo.value) {
    storage.toggleFavorite('line', lineId.value, lineInfo.value.name)
  }
}

function goToStop(stop: BusStop) {
  storage.addRecent('stop', stop.id, stop.name)
  router.push(`/stop/${stop.id}`)
}



// Vehicles for this line
const vehicles = ref<BusVehicle[]>([])
const lineVehicles = computed(() => 
  vehicles.value.filter(v => v.lineId === lineId.value)
)

const isRefreshing = ref(false)
const lastUpdated = ref<Date | null>(null)



async function fetchVehicles() {
  try {
    isRefreshing.value = true
    
    // First try the global endpoint directly via service
    const globalData = await busService.fetchVehicles()
    const validGlobalVehicles = globalData.filter(v => v.lineId === lineId.value)
    
    if (validGlobalVehicles.length > 0) {
      vehicles.value = globalData
      mapStore.vehicles = validGlobalVehicles
      return
    }

    // Fallback: Check arrivals for key stops to find vehicles
    // We pick up to 5 stops distributed along the line to "sample" vehicle locations
    if (lineStops.value.length > 0) {
      const stopsToCheck = []
      const step = Math.max(1, Math.floor(lineStops.value.length / 5))
      
      for (let i = 0; i < lineStops.value.length; i += step) {
        stopsToCheck.push(lineStops.value[i])
      }
      
      // Add last stop if not included
      if (lineStops.value.length > 0 && !stopsToCheck.includes(lineStops.value[lineStops.value.length - 1])) {
        stopsToCheck.push(lineStops.value[lineStops.value.length - 1])
      }

      // Fetch arrivals for these stops in parallel
      const promises = stopsToCheck.map(s => busService.fetchArrivals(s!.id))
      const results = await Promise.all(promises)
      
      // Extract unique vehicles from arrivals
      const derivedVehicles = new Map<string, BusVehicle>()
      
      results.flat().forEach(arrival => {
        if (arrival.lineId === lineId.value && arrival.vehicleRef && arrival.location) {
          derivedVehicles.set(arrival.vehicleRef, {
            id: arrival.vehicleRef,
            lineId: arrival.lineId,
            lineName: arrival.lineName,
            latitude: arrival.location.latitude,
            longitude: arrival.location.longitude,
            destination: arrival.destination
          })
        }
      })
      
      const newVehicles = Array.from(derivedVehicles.values())
      vehicles.value = newVehicles
      mapStore.vehicles = newVehicles
    }
  } catch (e) {
    console.error('Error fetching vehicles:', e)
  } finally {
    isRefreshing.value = false
  }
}

// Setup map and auto-refresh
let refreshInterval: ReturnType<typeof setInterval>

onMounted(() => {
  // mapStore.reset();
  mapStore.setPagePaddingFromMapPreviewContainer();
  if (lineInfo.value) {
    storage.addRecent('line', lineId.value, lineInfo.value.name)
    console.log('lineInfo.value', lineInfo.value)
  }
  
  fetchVehicles()
  refreshInterval = setInterval(fetchVehicles, 20000)
})

// Update map when line stops load or change (e.g., navigating between lines)
watch(lineStops, (stops) => {
  if (stops.length > 0) {
    mapStore.focusOnLine(lineId.value, stops)
  }
}, { immediate: true })

// Also watch lineId for route param changes
watch(lineId, () => {
  // Clear stale vehicles immediately before fetching new ones
  vehicles.value = []
  mapStore.vehicles = []
  mapStore.reset()
  if (lineInfo.value) {
    storage.addRecent('line', lineId.value, lineInfo.value.name)
  }
  fetchVehicles()
})

onUnmounted(() => {
  clearInterval(refreshInterval)
  // Clear vehicles to prevent stale data appearing on other pages
  mapStore.vehicles = []
})

const isLoading = computed(() => 
  linesStatus.value === 'pending' || stopsStatus.value === 'pending'
)
</script>

<template>
  <div class="max-w-3xl mx-auto flex flex-col md:block">
    <!-- Map Preview (Order 1 on Mobile, 2 on Desktop handled via classes mainly but here we want content first on desktop, map first on mobile) -->
    <!-- Mobile: Map (Top) -> Content
      Desktop: Content -> Map (Bottom)
    -->
    <div class="md:order-last mb-4 md:mb-0 md:mt-6">
       <MapPreview />
    </div>

    <!-- Content -->
    <div class="px-4 py-6 space-y-4">

    <!-- Loading -->
    <div v-if="isLoading" class="glass-card p-6">
      <LoadingSpinner size="lg" text="Cargando línea..." />
    </div>

    <template v-else>
      <!-- Header card -->
      <div class="glass-card p-5">
        <!-- Breadcrumb -->
        <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
          <NuxtLink to="/lines" class="hover:text-primary-500 transition-colors">Líneas</NuxtLink>
          <UIcon name="i-lucide-chevron-right" class="w-4 h-4" />
          <span>Línea {{ lineId }}</span>
        </div>

        <!-- Line info -->
        <div class="flex items-start gap-4">
          <div 
            class="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
            :class="getLineColor(lineId)"
            :style="{ viewTransitionName: `line-${lineId}` }"
          >
            <span 
              class="text-3xl font-bold"
              :style="{ viewTransitionName: `line-number-${lineId}` }"
            >
              {{ lineId }}
            </span>
          </div>

          <div class="flex-1 min-w-0">
            <template v-if="routeParts">
              <p 
                class="text-xl font-bold text-gray-900 dark:text-white"
                :style="{ viewTransitionName: `line-name-${lineId}` }"
              >
                {{ routeParts.origin }}
              </p>
              <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <UIcon name="i-lucide-arrow-right" class="w-4 h-4 shrink-0" />
                <p class="truncate">{{ routeParts.destination }}</p>
              </div>
            </template>
            <p 
              v-else
              class="text-xl font-bold text-gray-900 dark:text-white"
            >
              {{ lineInfo?.name || `Línea ${lineId}` }}
            </p>

            <!-- Stats -->
            <div class="flex items-center gap-4 mt-3 text-sm">
              <div class="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <UIcon name="i-lucide-map-pin" class="w-4 h-4" />
                <span>{{ lineStops.length }} paradas</span>
              </div>
              <div class="flex items-center gap-1.5">
                <UIcon 
                  name="i-lucide-bus" 
                  class="w-4 h-4"
                  :class="lineVehicles.length > 0 ? 'text-green-500' : 'text-gray-400'"
                />
                <span :class="lineVehicles.length > 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-500'">
                  {{ lineVehicles.length }} {{ lineVehicles.length === 1 ? 'bus activo' : 'buses activos' }}
                </span>
                <UIcon 
                  v-if="isRefreshing"
                  name="i-lucide-refresh-cw" 
                  class="w-3.5 h-3.5 text-gray-400 animate-spin"
                />
              </div>
            </div>
          </div>

          <button
            class="p-3 rounded-xl transition-all bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 shrink-0"
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

      <!-- Stops list -->
      <div class="glass-card p-5">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-list" class="w-5 h-5 text-primary-500" />
          Paradas de la línea ({{ lineStops.length }})
        </h2>

        <div v-if="lineStops.length === 0" class="text-center py-8 text-gray-500">
          <UIcon name="i-lucide-map-pin-off" class="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No se encontraron paradas para esta línea</p>
        </div>

        <div v-else class="space-y-2 max-h-96 overflow-y-auto">
          <button
            v-for="(stop, index) in lineStops"
            :key="stop.id"
            class="w-full flex items-center gap-3 p-3 bg-white/80 dark:bg-gray-800/80 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-all text-left"
            @click="goToStop(stop)"
          >
            <!-- Stop number in route -->
            <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center shrink-0">
              <span class="text-sm font-bold text-primary-600 dark:text-primary-400">
                {{ index + 1 }}
              </span>
            </div>

            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900 dark:text-white truncate">
                {{ stop.name }}
              </p>
              <p class="text-xs text-gray-500">Parada {{ stop.id }}</p>
            </div>

            <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-gray-400 shrink-0" />
          </button>
        </div>
      </div>

      </template>
    </div>
  </div>
</template>
