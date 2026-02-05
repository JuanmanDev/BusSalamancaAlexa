<script setup lang="ts">
import type { BusStop, BusVehicle } from '~/types/bus'

useSeoMeta({
  title: 'Mapa - Bus Salamanca',
  description: 'Mapa interactivo de paradas y autobuses de Salamanca',
})

const router = useRouter()
const storage = useStorage()
const busService = useBusService()
const geolocation = useGeolocation()
const mapStore = useMapStore()

// Data
const { data: allStops } = await useBusStops()

const { data: allLines } = await useBusLines()

// Format lines for USelectMenu
const lineSelectItems = computed(() => {
  const lines = allLines.value
  if (!lines || !Array.isArray(lines)) return []
  return lines.map((line: { id: string; name: string }) => ({
    label: `Línea ${line.id} - ${line.name}`,
    value: line.id
  }))
})

const vehicles = ref<BusVehicle[]>([])
const selectedStop = ref<BusStop | null>(null)
const selectedVehicle = ref<BusVehicle | null>(null)
const highlightLineId = ref<string | null>(null)
const isRefreshing = ref(false)

// Selected line item for USelectMenu - needs to match the item object structure
const selectedLineItem = computed(() => {
  if (!highlightLineId.value) return undefined
  return lineSelectItems.value.find(item => item.value === highlightLineId.value)
})

function handleLineSelect(item: { label: string; value: string } | undefined) {
  setLineFilter(item?.value || null)
}

// Helper for line color


// Filtered stops
const displayedStops = computed(() => {
  if (!allStops.value) return []
  if (highlightLineId.value) {
    return allStops.value.filter(s => s.lines?.includes(highlightLineId.value!))
  }
  return allStops.value
})

// Filtered vehicles based on line filter
const displayedVehicles = computed(() => {
  if (highlightLineId.value) {
    return vehicles.value.filter(v => v.lineId === highlightLineId.value)
  }
  return vehicles.value
})

// Fetch vehicles
async function fetchVehicles() {
  try {
    isRefreshing.value = true
    const fetched = await busService.fetchVehicles()
    vehicles.value = fetched
    // Sync to store immediately so BaseMap renders them
    mapStore.vehicles = displayedVehicles.value
  } catch (e) {
    console.error('Error fetching vehicles:', e)
  } finally {
    isRefreshing.value = false
  }
}

// Auto-refresh
let refreshInterval: ReturnType<typeof setInterval>

onMounted(() => {
  // Set map to full interactive mode
  mapStore.setMapState({
    isInteractive: true,
    isFullscreen: true,
    showControls: true,
    stops: displayedStops.value,
    vehicles: displayedVehicles.value,
  })

  geolocation.requestLocation()
  fetchVehicles()
  refreshInterval = setInterval(fetchVehicles, 15000)
})

// Update map when data changes
watch([displayedStops, displayedVehicles], () => {
  mapStore.stops = displayedStops.value
  mapStore.vehicles = displayedVehicles.value
  // Update followed vehicle position
  mapStore.updateFollowedVehicle(displayedVehicles.value)
}, { immediate: true })

onUnmounted(() => {
  clearInterval(refreshInterval)
  // mapStore.reset()
  mapStore.setMapState({
    // isInteractive: false,
    isFullscreen: false,
    // showControls: false,
    // stops: [],
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
  selectedVehicle.value = vehicle
  selectedStop.value = null // Clear stop selection
  
  // Center map on vehicle with offset
  centerMapWithOffset(vehicle.latitude, vehicle.longitude)
}

function centerMapWithOffset(lat: number, lng: number) {
  if (!mapStore.mapInstance) return 
  
  const height = mapContainer.value?.clientHeight || window.innerHeight
  const offsetY = height * 0.2 // 20% height (to shift center down, so point appears up)
  
  // Use flyTo with offset
  mapStore.mapInstance.flyTo({
    center: [lng, lat],
    zoom: 16,
    offset: [0, -offsetY], // Shift center UP to move point DOWN? No. 
                           // Offset [0, -100] means the center is at (W/2, H/2 - 100).
                           // If we center on Paris, Paris is at (W/2, H/2 - 100).
                           // This means Paris is HIGHER on screen. Correct.
    padding: { bottom: 0, top: 0, left: 0, right: 0 }
  })
}

// Watch selected vehicle to follow it
watch(() => vehicles.value, (newVehicles) => {
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
  if (geolocation.userLocation.value) {
    if (mapStore.mapInstance) {
        mapStore.mapInstance.flyTo({
            center: [geolocation.userLocation.value.lng, geolocation.userLocation.value.lat],
            zoom: 16
        })
    } else {
        mapStore.center = [geolocation.userLocation.value.lng, geolocation.userLocation.value.lat]
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

function setLineFilter(lineId: string | null) {
  highlightLineId.value = lineId
  mapStore.highlightLineId = lineId
}

// Refs
const mapContainer = ref<HTMLDivElement>()
</script>

<template>
  <div class="relative h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)]" ref="mapContainer">
    <!-- The map is in the layout background, so we just show overlay UI? 
         WAIT. If map is in layout background, we CANNOT control its flyTo instance easily from here unless we use the Store or BaseMap emits event globally?
         Actually default.vue renders BaseMap. map.vue renders NOTHING map-related directly?
         Review `map.vue` template. It currently DOES NOT include <BaseMap>. 
         It relies on `default.vue` <BaseMap>.
         BUT `default.vue` passes props from `mapStore`.
         We need `mapStore` to expose `flyTo` or `mapInstance`?
         OR we should render a local BaseMap here specifically for the "Map Page" to have full control?
         The plan said "Move the map to the default layout as a persistent background layer".
         So `map.vue` is just UI OVERLAY.
         
         PROBLEM: `default.vue` holds the Map instance. `map.vue` cannot mistakenly access it via a local Ref unless we move instance to Store.
         
         SOLUTION: Update `useMapStore` to hold the `mapInstance` (shallowRef).
         `BaseMap` should write to `mapStore.mapInstance`.
         Then `map.vue` can read `mapStore.mapInstance`.
    -->
    
    <!-- Top controls -->
    <div class="absolute top-4 left-4 right-4 z-40 flex items-start gap-3 pointer-events-none">
      <!-- Line filter with searchable select -->
      <div class="glass-card p-2 flex-1 max-w-xs pointer-events-auto">
        <USelectMenu
          :model-value="selectedLineItem"
          :items="lineSelectItems"
          placeholder="Todas las líneas"
          searchable
          :search-attributes="['label']"
          value-attribute="value"
          class="w-full"
          @update:model-value="handleLineSelect"
        />
      </div>

      <!-- Refresh indicator -->
      <button
        class="glass-card p-3 hover:scale-105 transition-transform pointer-events-auto"
        :class="isRefreshing ? 'opacity-50' : ''"
        @click="fetchVehicles"
      >
        <UIcon 
          name="i-lucide-refresh-cw" 
          class="w-5 h-5 text-gray-600 dark:text-gray-400"
          :class="isRefreshing ? 'animate-spin' : ''"
        />
      </button>

      <!-- Center on user -->
      <button
        v-if="geolocation.userLocation.value"
        class="glass-card p-3 hover:scale-105 transition-transform pointer-events-auto"
        @click="centerOnUser"
      >
        <UIcon name="i-lucide-navigation" class="w-5 h-5 text-primary-500" />
      </button>
    </div>

    <!-- Stats -->
    <div class="absolute top-20 left-4 z-40 pointer-events-none">
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
            {{ displayedVehicles.length }} buses activos
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
