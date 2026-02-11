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
const localVehicles = ref<BusVehicle[]>([])

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
const showStops = ref(true)
const showBuses = ref(true)
const showRoutes = ref(false)

// Logic for showing routes
const { getLineGeometry } = useLineGeometry()
let routeUpdateTimer: any = null

watch([showRoutes, selectedLineIds], async ([show, ids]) => {
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
    return lineSelectItems.value.filter(item => selectedLineIds.value.includes(item.value))
  },
  set(items: { label: string; value: string }[]) {
    selectedLineIds.value = items?.map(item => item.value) || []
  }
})

// Select all / none helpers
function selectAllLines() {
  selectedLineIds.value = [...lineSelectItems.value.map(item => item.value)]
}

function selectNoLines() {
  selectedLineIds.value = []
}

// Filtered stops based on selected lines (local filtering, doesn't modify store)
const filteredStops = computed(() => {
  if (!allStops.value || !Array.isArray(allStops.value)) return []
  if (selectedLineIds.value.length === 0) {
    return allStops.value
  }
  return allStops.value.filter((s: BusStop) => 
    s.lines?.some((lineId: string) => selectedLineIds.value.includes(lineId))
  )
})

// Filtered vehicles based on selected lines
const filteredVehicles = computed(() => {
  if (selectedLineIds.value.length === 0) {
    return localVehicles.value
  }
  return localVehicles.value.filter(v => selectedLineIds.value.includes(v.lineId))
})

// What to display based on visibility toggles
const displayedStops = computed(() => showStops.value ? filteredStops.value : [])
const displayedVehicles = computed(() => showBuses.value ? filteredVehicles.value : [])

// Fetch vehicles for map page - using arrivals from multiple stops
const busService = useBusService()
let refreshInterval: ReturnType<typeof setInterval> | null = null

async function fetchVehicles() {
  try {
    isRefreshing.value = true
    
    // First try the global vehicles endpoint
    const globalVehicles = await busService.fetchVehicles()
    if (globalVehicles.length > 0) {
      localVehicles.value = globalVehicles
      console.log('[Map] Fetched', globalVehicles.length, 'vehicles from global endpoint')
      return
    }
    
    // Fallback: Extract vehicles from arrivals across multiple stops
    console.log('[Map] Global endpoint empty, fetching from arrivals...')
    const stops = allStops.value
    if (!stops || !Array.isArray(stops) || stops.length === 0) {
      console.warn('[Map] No stops available to fetch arrivals from')
      return
    }
    
    // Sample stops distributed across the city (every 10th stop, max 20 stops)
    const step = Math.max(1, Math.floor(stops.length / 20))
    const stopsToCheck = stops.filter((_: BusStop, index: number) => index % step === 0).slice(0, 20)
    
    console.log('[Map] Fetching arrivals from', stopsToCheck.length, 'stops')
    
    // Fetch arrivals in parallel
    const promises = stopsToCheck.map((stop: BusStop) => 
      busService.fetchArrivals(stop.id).catch(() => [])
    )
    const results = await Promise.all(promises)
    
    // Extract unique vehicles from arrivals
    const vehicleMap = new Map<string, BusVehicle>()
    
    results.flat().forEach((arrival: any) => {
      if (arrival.vehicleRef && arrival.location) {
        vehicleMap.set(arrival.vehicleRef, {
          id: arrival.vehicleRef,
          lineId: arrival.lineId,
          lineName: arrival.lineName,
          latitude: arrival.location.latitude,
          longitude: arrival.location.longitude,
          destination: arrival.destination
        })
      }
    })
    
    const extractedVehicles = Array.from(vehicleMap.values())
    localVehicles.value = extractedVehicles
    console.log('[Map] Extracted', extractedVehicles.length, 'vehicles from arrivals')
    
  } catch (e) {
    console.error('Error fetching vehicles:', e)
  } finally {
    isRefreshing.value = false
  }
}

// Set map context on mount
onMounted(async () => {
  // Set map to fullscreen interactive mode
  mapStore.setMapState({
    isInteractive: true,
    isFullscreen: true,
    showControls: true,
  })
  
  // Load all stops
  if (allStops.value && Array.isArray(allStops.value)) {
    mapStore.stops = allStops.value
  }
  
  // Request location
  const geolocation = useGeolocation()
  geolocation.requestLocation()
  
  // Fetch vehicles
  await fetchVehicles()
  
  // Start auto-refresh
  refreshInterval = setInterval(fetchVehicles, 15000)
})

// Update store with filtered data for the map component
watch([displayedStops, displayedVehicles], ([stops, vehicles]) => {
  mapStore.stops = stops
  mapStore.vehicles = vehicles
}, { immediate: true, deep: false })

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
  mapStore.setMapState({
    isFullscreen: false,
    vehicles: [],
  })
})

// Handle stop selection
function handleStopClick(stop: BusStop) {
  selectedStop.value = stop
  selectedVehicle.value = null // Clear vehicle selection
  
  // Center map on stop with offset (top 60% of screen)
  if (stop.latitude && stop.longitude) {
    centerMapWithOffset(stop.latitude, stop.longitude)
  }
}

// Handle vehicle selection
function handleVehicleClick(vehicle: BusVehicle) {
  return;
  selectedVehicle.value = vehicle
  selectedStop.value = null // Clear stop selection
  
  // Center map on vehicle with offset
  centerMapWithOffset(vehicle.latitude, vehicle.longitude)
}

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

// Watch for vehicle updates to follow selected vehicle
watch(localVehicles, (newVehicles) => {
  if (selectedVehicle.value) {
    const updated = newVehicles.find(v => v.id === selectedVehicle.value?.id)
    if (updated) {
      selectedVehicle.value = updated
      // If we are following, update center (smoothly)
      if (mapStore.mapInstance && !mapStore.mapInstance.isMoving()) { 
        mapStore.mapInstance.easeTo({
            center: [updated.longitude, updated.latitude],
            offset: [0, -(mapContainer.value?.clientHeight || window.innerHeight) * 0.2],
            duration: 1000 
        })
      }
    }
  }
}, { deep: true })

function centerOnUser() {
  const geo = useGeolocation()
  if (geo.userLocation.value) {
    if (mapStore.mapInstance) {
        mapStore.mapInstance.flyTo({
            center: [geo.userLocation.value.lng, geo.userLocation.value.lat],
            zoom: 16
        })
    } else {
        mapStore.center = [geo.userLocation.value.lng, geo.userLocation.value.lat]
        mapStore.zoom = 16
    }
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
      <div class="flex items-start gap-2 flex-wrap">
        <!-- Line filter with multi-select -->
        <div class="glass-card p-2 flex-1 min-w-[200px] max-w-sm pointer-events-auto">
          <USelectMenu
            v-model="selectedLineItems"
            :items="lineSelectItems"
            placeholder="Todas las líneas"
            searchable
            multiple
            :search-attributes="['label']"
            class="w-full"
          >
            <template #label>
              <span v-if="selectedLineIds.length === 0" class="text-gray-500">
                Todas las líneas
              </span>
              <span v-else-if="selectedLineIds.length === 1">
                Línea {{ selectedLineIds[0] }}
              </span>
              <span v-else>
                {{ selectedLineIds.length }} líneas
              </span>
            </template>
          </USelectMenu>
        </div>

        <!-- Select All / None buttons -->
        <div class="glass-card p-1.5 flex gap-1 pointer-events-auto">
          <button
            class="px-3 py-2 text-xs font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
            :class="selectedLineIds.length === lineSelectItems.length && lineSelectItems.length > 0 ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30' : 'text-gray-600 dark:text-gray-400'"
            @click="selectAllLines"
            title="Seleccionar todas"
          >
            <UIcon name="i-lucide-check-check" class="w-4 h-4" />
            <span class="hidden sm:inline">Todas</span>
          </button>
          <button
            class="px-3 py-2 text-xs font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
            :class="selectedLineIds.length === 0 ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30' : 'text-gray-600 dark:text-gray-400'"
            @click="selectNoLines"
            title="Deseleccionar todas"
          >
            <UIcon name="i-lucide-x" class="w-4 h-4" />
            <span class="hidden sm:inline">Ninguna</span>
          </button>
        </div>

        <!-- Visibility toggles -->
        <div class="glass-card px-3 py-2 flex items-center gap-3 pointer-events-auto">
          <label class="flex items-center gap-1.5 cursor-pointer">
            <UCheckbox v-model="showStops" />
            <UIcon name="i-lucide-map-pin" class="w-4 h-4" :class="showStops ? 'text-primary-500' : 'text-gray-400'" />
            {{ displayedStops.length }}
            <span class="text-xs hidden sm:inline" :class="showStops ? 'text-gray-900 dark:text-white' : 'text-gray-400'">Paradas</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <UCheckbox v-model="showBuses" />
            <UIcon name="i-lucide-bus" class="w-4 h-4" :class="showBuses ? 'text-green-500' : 'text-gray-400'" />
            {{ displayedVehicles.length }}
            <span class="text-xs hidden sm:inline" :class="showBuses ? 'text-gray-900 dark:text-white' : 'text-gray-400'">Buses</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <UCheckbox v-model="showRoutes" />
            <UIcon name="i-lucide-route" class="w-4 h-4" :class="showRoutes ? 'text-blue-500' : 'text-gray-400'" />
            <span class="text-xs hidden sm:inline" :class="showRoutes ? 'text-gray-900 dark:text-white' : 'text-gray-400'">Rutas</span>
          </label>
        </div>

        <!-- Refresh indicator -->
        <button
          class="glass-card p-3 hover:scale-105 transition-transform pointer-events-auto"
          :class="isRefreshing ? 'opacity-50' : ''"
          :disabled="isRefreshing"
          @click="refresh"
        >
          <UIcon 
            name="i-lucide-refresh-cw" 
            class="w-5 h-5 text-gray-600 dark:text-gray-400"
            :class="isRefreshing ? 'animate-spin' : ''"
          />
        </button>

        <!-- Center on user -->
        <button
          v-if="hasUserLocation"
          class="glass-card p-3 hover:scale-105 transition-transform pointer-events-auto"
          @click="centerOnUser"
        >
          <UIcon name="i-lucide-navigation" class="w-5 h-5 text-primary-500" />
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div v-if="0" class="absolute top-24 left-4 z-40 pointer-events-none">
      <div class="glass-card px-3 py-2 text-sm space-y-1 pointer-events-auto">
        <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <UIcon name="i-lucide-map-pin" class="w-4 h-4" />
          <span>{{ displayedStops.length }} paradas</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon 
            name="i-lucide-bus" 
            class="w-4 h-4"
            :class="displayedVehicles.length > 0 ? 'text-green-500' : 'text-gray-400'"
          />
          <span :class="displayedVehicles.length > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'">
            {{ displayedVehicles.length }} buses
          </span>
        </div>
      </div>
    </div>

    <!-- Selected Stop Panel -->
    <Transition name="slide-up">
      <div 
        v-if="selectedStop"
        class="absolute bottom-4 left-4 right-4 z-50 md:bottom-8 md:right-8 md:left-auto md:w-96 pointer-events-auto"
      >
        <div class="glass-card overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700">
           <!-- Header colored strip -->
           <div class="h-2 bg-primary-500 w-full"></div>
           
           <div class="p-5">
              <div class="flex items-start justify-between gap-4 mb-4">
                 <div>
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                       {{ selectedStop.name }}
                    </h3>
                    <p class="text-sm text-gray-500 mt-1 flex items-center gap-1">
                       <UIcon name="i-lucide-map-pin" class="w-3 h-3" />
                       Parada {{ selectedStop.id }}
                    </p>
                 </div>
                 <button 
                    class="p-2 -mr-2 -mt-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    @click="clearSelection"
                 >
                    <UIcon name="i-lucide-x" class="w-5 h-5" />
                 </button>
              </div>

              <!-- Connections -->
              <div v-if="selectedStop.lines?.length" class="mb-5">
                 <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Conexiones</p>
                 <div class="flex flex-wrap gap-2">
                    <button 
                       v-for="line in selectedStop.lines" 
                       :key="line"
                       class="min-w-[2rem] h-8 px-2 bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-primary-900/30 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center font-bold text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-sm"
                       @click="goToLine(line)"
                    >
                       {{ line }}
                    </button>
                 </div>
              </div>

              <!-- Actions -->
              <div class="flex gap-3">
                 <button
                    class="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2.5 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
                    @click="goToStop(selectedStop)"
                 >
                    <span>Ver detalles</span>
                    <UIcon name="i-lucide-arrow-right" class="w-4 h-4" />
                 </button>
              </div>
           </div>
        </div>
      </div>
    </Transition>

    <!-- Selected Vehicle Panel -->
    <Transition name="slide-up">
      <div 
        v-if="selectedVehicle"
        class="absolute bottom-4 left-4 right-4 z-50 md:bottom-8 md:right-8 md:left-auto md:w-96 pointer-events-auto"
      >
        <div class="glass-card overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700">
           <!-- Header colored strip with dynamic color -->
           <div class="h-2 w-full" :class="getLineColor(selectedVehicle.lineId)"></div>
           
           <div class="p-5">
              <div class="flex items-start justify-between gap-4 mb-4">
                 <div class="flex items-center gap-3">
                    <div 
                       class="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md"
                       :class="getLineColor(selectedVehicle.lineId)"
                    >
                       <span class="text-xl font-bold">{{ selectedVehicle.lineId }}</span>
                    </div>
                    <div>
                       <h3 class="font-bold text-gray-900 dark:text-white leading-tight">
                          {{ selectedVehicle.lineName }}
                       </h3>
                       <p class="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                          <UIcon name="i-lucide-navigation" class="w-3 h-3" />
                          Destino: {{ selectedVehicle.destination }}
                       </p>
                    </div>
                 </div>
                 <button 
                    class="p-2 -mr-2 -mt-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    @click="clearSelection"
                 >
                    <UIcon name="i-lucide-x" class="w-5 h-5" />
                 </button>
              </div>
              
              <!-- Info grid -->
              <div class="grid grid-cols-2 gap-4 mb-5 text-sm">
                 <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p class="text-xs text-gray-500 mb-1">Actualizado hace</p>
                    <p class="font-medium text-gray-900 dark:text-white">Justo ahora</p>
                 </div>
                 <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p class="text-xs text-gray-500 mb-1">Vehículo ID</p>
                    <p class="font-medium text-gray-900 dark:text-white font-mono">{{ selectedVehicle.id }}</p>
                 </div>
              </div>

              <!-- Actions -->
              <button
                 class="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white py-2.5 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                 @click="goToLine(selectedVehicle.lineId)"
              >
                 <UIcon name="i-lucide-map" class="w-4 h-4" />
                 <span>Ver recorrido de línea</span>
              </button>
           </div>
        </div>
      </div>
    </Transition>
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
