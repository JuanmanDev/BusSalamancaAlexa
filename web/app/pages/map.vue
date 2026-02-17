<script setup lang="ts">
import type { BusStop, BusVehicle } from '~/types/bus'

useSeoMeta({
  title: 'Mapa - Bus Salamanca',
  description: 'Mapa interactivo de paradas y autobuses de Salamanca',
})

const router = useRouter()
const storage = useStorage()
const geolocation = useGeolocation()
const mapStore = useMapStore()

// Data from store
const { data: allStops } = await useBusStops()
const { data: allLines } = await useBusLines()

// Local state for vehicles fetched by the map page
// Local state for vehicles fetched by the map page (REMOVED, using store)
// const localVehicles = ref<BusVehicle[]>([])

// Format lines for USelectMenu (multi-select)
const lineSelectItems = computed(() => {
  const lines = allLines.value
  if (!lines || !Array.isArray(lines)) return []
  return lines.map((line: { id: string; name: string }) => ({
    label: `${line.id} - ${line.name}`,
    value: line.id
  }))
})

const selectedStop = ref<BusStop | null>(null)
const selectedVehicle = ref<BusVehicle | null>(null)
const selectedLineIds = ref<string[]>([]) // Multi-select: array of line IDs
const isRefreshing = ref(false)

// Visibility toggles
// Visibility toggles (mapped to store)
const showStops = computed({
  get: () => mapStore.showStops,
  set: (val) => mapStore.toggleShowStops(val)
})
const showBuses = computed({
  get: () => mapStore.showVehicles,
  set: (val) => mapStore.toggleShowVehicles(val)
})
const showRoutes = computed({
  get: () => mapStore.showRoutes,
  set: (val) => mapStore.toggleShowRoutes(val)
})

// Logic for showing routes
const { getLineGeometry } = useLineGeometry()
let routeUpdateTimer: any = null

// Watch store filterLineIds for route drawing
watch([showRoutes, () => mapStore.filterLineIds], async ([show, ids]) => {
  // Clear lines if toggle off or no lines selected
  if (!show || ids.length === 0) {
    if (mapStore.linesToDraw.length > 0) {
         mapStore.setLines([])
    }
    return
  }
  
  // Debounce updates
  if (routeUpdateTimer) clearTimeout(routeUpdateTimer)
  
  routeUpdateTimer = setTimeout(async () => {
      // Limit to reasonable number to prevent massive fetching if "Select All" is clicked (40+ lines)
      // "Select All" logic sets selectedLineIds to ALL lines.
      // We should probably show a toast or limit it. 
      // User said "show the lines... so it could be possible to see multiples lines".
      // We will try.
      
      const linesToShow = (allLines.value as any[])?.filter(l => ids.includes(l.id)) || []
      
      if (linesToShow.length === 0) return

      // Use a generator or promise all?
      // We will render straight lines first for all, then fetch details.
      
      const isMany = linesToShow.length > 5
      const isVeryMany = linesToShow.length >= 20
      const width = isVeryMany ? 2 : (isMany ? 3 : 5)
      const opacity = isVeryMany ? 0.5 : (isMany ? 0.7 : 0.9)

      let allSegments: { id: string, color: string, points: { lat: number, lng: number }[], width?: number, opacity?: number }[] = []
      const fetchers: (() => Promise<any>)[] = []

      // Prepare data
      for (const line of linesToShow) {
          // pass allStops.value to the composable if needed or let it use its own?
          // The composable uses `useBusStops()`. If it's cached/shared, it's fine.
          // But passing local allStops might be faster if accessible.
          // Composable signature: getLineGeometry(lineId, lineInfo, lineStops)
          
          // We need stops for this line.
          const stopsData = (allStops.value as any[]) || []
          const lineStops = stopsData.filter(s => s.lines?.includes(line.id)).sort((a,b) => parseInt(a.id) - parseInt(b.id)) || []
          
          if (lineStops.length > 0) {
             const { initial, fetchDetailed } = await getLineGeometry(line.id, line, lineStops)
             
             // Apply styles
             const styledInitial = initial.map(s => ({ ...s, width, opacity }))
             allSegments.push(...styledInitial)
             fetchers.push(async () => {
                 const details = await fetchDetailed()
                 return details.map((d: any) => ({ ...d, width, opacity }))
             })
          }
      }
      
      // 1. Draw straight lines immediately
      mapStore.setLines([...allSegments])
      
      // 2. Fetch details (OSRM)
      // We can do this in parallel but maybe rate limit? 
      // Our server caches, so it should be fast after first run.
      // But 40 lines * 2 directions = 80 requests. Browser might stall.
      // We'll run them.
      
      try {
          const detailResults = await Promise.all(fetchers.map(f => f()))
          const flatDetails = detailResults.flat()
          
          // Re-update map
          mapStore.setLines(flatDetails)
      } catch (e) {
          console.error('Error fetching details for lines', e)
      }
      
  }, 500)
}, { immediate: true })

// Selected line items for USelectMenu (array for multi-select)
const selectedLineItems = computed({
  get() {
    return lineSelectItems.value.filter(item => mapStore.filterLineIds.includes(item.value))
  },
  set(items: { label: string; value: string }[]) {
     mapStore.setFilterLineIds(items?.map(item => item.value) || [])
  }
})

// Select all / none helpers
function selectAllLines() {
  mapStore.setFilterLineIds([...lineSelectItems.value.map(item => item.value)])
}

function selectNoLines() {
  mapStore.setFilterLineIds([])
}

// Displayed counts for stats
const displayedStopsCount = computed(() => mapStore.stops.length)
const displayedVehiclesCount = computed(() => mapStore.vehicles.length)

// Fetch vehicles for map page - using store raw vehicles
const busService = useBusService()
let refreshInterval: ReturnType<typeof setInterval> | null = null

async function fetchVehicles() {
    // Legacy support or manual refresh trigger
    // Now handled by store auto-update
    await mapStore.updateVehiclesGlobal?.() // If exposed, or just rely on interval
    // If not exposed, we can force a re-fetch via service but store handles it.
    // Let's just trigger a store action if possible, or do nothing if auto-update is on.
    // mapStore.startGlobalVehicleUpdates() // it's already running.
}

// Set map context on mount
onMounted(async () => {
    await mapStore.setContextToMapPage()
})

// Update store with filtered data for the map component
// REMOVED: Store now handles its own filtering via updateDisplay() logic.

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
  mapStore.clearContext(true) // Keep vehicles to prevent flash
})


function centerMapWithOffset(lat: number, lng: number) {
  if (!mapStore.mapInstance) return 
  return;
  
  const height = mapContainer.value?.clientHeight || window.innerHeight
  const offsetY = height * 0.2 // 20% height (to shift center down, so point appears up)
  
  // Use flyTo with offset
  mapStore.mapInstance.flyTo({
    center: [lng, lat],
    zoom: 16,
    offset: [0, -offsetY],
    padding: { bottom: 0, top: 0, left: 0, right: 0 },
    duration: 1000
  })
}

function centerOnUser() {
  const geo = useGeolocation()
  if (geo.userLocation.value) {
    mapStore.updatePosition([
      { lat: geo.userLocation.value.lat, lng: geo.userLocation.value.lng }
    ], { zoom: 16, type: 'user' })
  }
}

function goToStop(stop: BusStop) {
  storage.addRecent('stop', stop.id, stop.name)
  router.push(`/stop/${stop.id}`)
}

function goToLine(lineId: string) {
   storage.addRecent('line', lineId, `Línea ${lineId}`)
   router.push(`/line/${lineId}`)
}

function clearSelection() {
  selectedStop.value = null
  selectedVehicle.value = null
}

async function refresh() {
  await fetchVehicles()
}

// Refs
const mapContainer = ref<HTMLDivElement>()

// Computed for user location button visibility
const hasUserLocation = computed(() => useGeolocation().userLocation.value !== null)
</script>

<template>
  <div class="relative h-[calc(100vh-10rem)]]" ref="mapContainer">
    <!-- Top controls -->
    <div class="absolute top-4 left-4 right-4 z-40 flex flex-col gap-3 pointer-events-none">
      <!-- First row: Line filter and actions -->
      <div class="flex items-center justify-center gap-2 flex-wrap w-full pointer-events-none">
        <!-- Line filter with multi-select -->
        <div class="glass-card p-1.5 flex-1 min-w-[200px] max-w-sm pointer-events-auto flex items-center h-10">
          <USelectMenu
            v-model="selectedLineItems"
            :items="lineSelectItems"
            placeholder="Todas las líneas"
            searchable
            multiple
            variant="ghost"
            :search-attributes="['label']"
            class="w-full"
          >
            <template #label>
              <span v-if="mapStore.filterLineIds.length === 0" class="text-gray-500 truncate">
                Todas las líneas
              </span>
              <span v-else-if="mapStore.filterLineIds.length === 1" class="truncate">
                Línea {{ mapStore.filterLineIds[0] }}
              </span>
              <span v-else class="truncate">
                {{ mapStore.filterLineIds.length }} líneas
              </span>
            </template>
          </USelectMenu>
        </div>

        <!-- Select All / None buttons -->
        <div class="glass-card p-1 flex gap-1 pointer-events-auto h-10 items-center">
          <button
            class="px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 h-full"
            :class="mapStore.filterLineIds.length === lineSelectItems.length && lineSelectItems.length > 0 ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30' : 'text-gray-600 dark:text-gray-400'"
            @click="selectAllLines"
            title="Seleccionar todas"
          >
            <UIcon name="i-lucide-check-check" class="w-4 h-4" />
            <span class="hidden sm:inline">Todas</span>
          </button>
          <button
            class="px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 h-full"
            :class="mapStore.filterLineIds.length === 0 ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30' : 'text-gray-600 dark:text-gray-400'"
            @click="selectNoLines"
            title="Deseleccionar todas"
          >
            <UIcon name="i-lucide-x" class="w-4 h-4" />
            <span class="hidden sm:inline">Ninguna</span>
          </button>
        </div>

        <!-- Visibility toggles -->
        <div class="glass-card px-3 flex items-center gap-3 pointer-events-auto h-10">
          <label class="flex items-center gap-1.5 cursor-pointer select-none">
            <UCheckbox v-model="showStops" />
            <UIcon name="i-lucide-map-pin" class="w-4 h-4" :class="showStops ? 'text-primary-500' : 'text-gray-400'" />
            {{ displayedStopsCount }}
            <span class="text-xs hidden sm:inline" :class="showStops ? 'text-gray-900 dark:text-white' : 'text-gray-400'">Paradas</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer select-none">
            <UCheckbox v-model="showBuses" />
            <UIcon name="i-lucide-bus" class="w-4 h-4" :class="showBuses ? 'text-green-500' : 'text-gray-400'" />
            {{ displayedVehiclesCount }}
            <span class="text-xs hidden sm:inline" :class="showBuses ? 'text-gray-900 dark:text-white' : 'text-gray-400'">Buses</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer select-none">
            <UCheckbox v-model="showRoutes" />
            <UIcon name="i-lucide-route" class="w-4 h-4" :class="showRoutes ? 'text-blue-500' : 'text-gray-400'" />
            <span class="text-xs hidden sm:inline" :class="showRoutes ? 'text-gray-900 dark:text-white' : 'text-gray-400'">Rutas</span>
          </label>
        </div>

        <!-- Refresh indicator -->
        <button
          class="glass-card px-3 py-1.5 h-10 flex items-center justify-center gap-2 hover:scale-105 transition-transform pointer-events-auto"
          :class="isRefreshing ? 'opacity-50' : ''"
          :disabled="isRefreshing"
          @click="refresh"
          title="Actualizar buses"
        >
          <UIcon 
            name="i-lucide-refresh-cw" 
            class="w-4 h-4 text-gray-600 dark:text-gray-400"
            :class="isRefreshing ? 'animate-spin' : ''"
          />
          <span class="hidden md:inline text-xs font-medium text-gray-700 dark:text-gray-300">Actualizar</span>
        </button>

        <!-- Center on user -->
        <button
          v-if="hasUserLocation"
          class="glass-card px-3 py-1.5 h-10 flex items-center justify-center gap-2 hover:scale-105 transition-transform pointer-events-auto"
          @click="centerOnUser"
          title="Mi ubicación"
        >
          <UIcon name="i-lucide-navigation" class="w-4 h-4 text-primary-500" />
          <span class="hidden md:inline text-xs font-medium text-gray-700 dark:text-gray-300">Ubicación</span>
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div v-if="0" class="absolute top-24 left-4 z-40 pointer-events-none">
      <div class="glass-card px-3 py-2 text-sm space-y-1 pointer-events-auto">
        <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <UIcon name="i-lucide-map-pin" class="w-4 h-4" />
          <span>{{ displayedStopsCount }} paradas</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon 
            name="i-lucide-bus" 
            class="w-4 h-4"
            :class="displayedVehiclesCount > 0 ? 'text-green-500' : 'text-gray-400'"
          />
          <span :class="displayedVehiclesCount > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'">
            {{ displayedVehiclesCount }} buses
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
