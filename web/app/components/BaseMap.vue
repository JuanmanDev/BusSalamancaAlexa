<script setup lang="ts">
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { BusStop, BusVehicle, BusLine } from '~/types/bus'

const props = withDefaults(defineProps<{
  center?: [number, number]
  zoom?: number
  interactive?: boolean
  showControls?: boolean
  stops?: BusStop[]
  vehicles?: BusVehicle[]
  highlightStopId?: string | null
  highlightLineId?: string | null
  highlightVehicleId?: string | null
  showUserLocation?: boolean
  padding?: { top: number; bottom: number; left: number; right: number }
}>(), {
  center: () => [-5.6635, 40.9701], // Salamanca [lng, lat]
  zoom: 14,
  interactive: true,
  showControls: true,
  showUserLocation: true,
  padding: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
})

const emit = defineEmits<{
  stopClick: [stop: BusStop]
  vehicleClick: [vehicle: BusVehicle]
  mapReady: [map: maplibregl.Map]
}>()

const colorMode = useColorMode()
const geolocation = useGeolocation()

const mapContainer = ref<HTMLDivElement>()
const map = shallowRef<maplibregl.Map | null>(null)
const isLoaded = ref(false)

// Map styles
const LIGHT_STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const DARK_STYLE = 'https://tiles.openfreemap.org/styles/dark'

const mapStyle = computed(() => 
  colorMode.value === 'dark' ? DARK_STYLE : LIGHT_STYLE
)

// Store markers for cleanup
const stopMarkers = shallowRef<maplibregl.Marker[]>([])
const vehicleMarkers = shallowRef<Map<string, { marker: maplibregl.Marker; position: [number, number] }>>(new Map())
const userMarker = shallowRef<maplibregl.Marker | null>(null)

// Initialize map
onMounted(() => {
  if (!mapContainer.value) return

  const mapInstance = new maplibregl.Map({
    container: mapContainer.value,
    style: mapStyle.value,
    center: props.center,
    zoom: props.zoom,
    interactive: props.interactive,
    attributionControl: false,
  })

  if (props.showControls && props.interactive) {
    mapInstance.addControl(new maplibregl.NavigationControl(), 'bottom-right')
    mapInstance.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')
  }

  mapInstance.on('load', () => {
    isLoaded.value = true
    map.value = markRaw(mapInstance)
    setupMapListeners(mapInstance)
    emit('mapReady', mapInstance)
    
    // Add initial markers
    updateStopMarkers()
    updateVehicleMarkers()
    
    if (props.showUserLocation) {
      updateUserLocation()
    }

    if (props.padding) {
      mapInstance.setPadding(props.padding)
    }

    // Move to the current position
    mapStore.setFullscreen(mapStore.isFullscreen);
  })
})

// Watch for theme changes
watch(mapStyle, (newStyle) => {
  if (map.value) {
    map.value.setStyle(newStyle)
  }
})

// Watch for interactive prop changes - enable/disable interactions
watch(() => props.interactive, (isInteractive) => {
  if (!map.value) return
  
  if (isInteractive) {
    map.value.scrollZoom.enable()
    map.value.boxZoom.enable()
    map.value.dragRotate.enable()
    map.value.dragPan.enable()
    map.value.keyboard.enable()
    map.value.doubleClickZoom.enable()
    map.value.touchZoomRotate.enable()
  } else {
    map.value.scrollZoom.disable()
    map.value.boxZoom.disable()
    map.value.dragRotate.disable()
    map.value.dragPan.disable()
    map.value.keyboard.disable()
    map.value.doubleClickZoom.disable()
    map.value.touchZoomRotate.disable()
  }
})

// Current selected stop data for the Card
const selectedStopData = computed(() => {
  if (!mapStore.highlightStopId || !props.stops) return null
  if (!mapStore.isFullscreen) return null
  return props.stops.find(s => s.id === mapStore.highlightStopId)
})

// New Event-based positioning system from consumers (via the store passed as props indirectly or store)
// Actually we need the event passed in. Ideally BaseMap should be dumb or use the store. 
// Given the previous setup, BaseMap was using props. 
// However, the cleanest way per plan is to watch the store's event.
// Since BaseMap is receiving props from layouts/default.vue which reads from MapStore,
// we should add a prop for 'positionEvent' and watch it.

const mapStore = useMapStore() // We can use the store directly if we want, or rely on prop.
// Using store directly inside the component makes it easier to track the event
// without passing it through layouts. But BaseMap seemed to be "dumb" before receiving data from store.
// Let's stick to the prop pattern if possible, OR just use the store since we are in `components/BaseMap.vue`.
// The user plan said: "Component (`web/app/components/BaseMap.vue`): Watch `mapStore.positionEvent`"
// So we will import the store.


watch(() => mapStore.positionEvent, (event) => {
    if (!map.value || !event) return
    
    // Logic: 
    // Single Point vs Multi Point
    // Map Mode (Fullscreen) vs Preview Mode
    
    // We can check mapStore.isFullscreen directly here too
    const isFullscreen = mapStore.isFullscreen
    const points = event.points

    const isSinglePoint = points.length === 1
    
    if (isSinglePoint) {
        const point = points[0]!
        const targetZoom = event.zoom ?? 15 // Default zoom for single point
        
        if (isFullscreen) {
            // Center on screen
             map.value.flyTo({
                center: [point.lng, point.lat],
                zoom: targetZoom,
                padding: 0, // No padding needed for fullscreen centering
                duration: 2000,
                essential: mapStore.forceAnimations,
            })
        } else {
            // Preview Mode
            // Center within the preview area defined by padding
            // Use store padding or event padding
            const p = event.padding ?? mapStore.padding
            
             map.value.flyTo({
                center: [point.lng, point.lat],
                zoom: targetZoom,
                padding: p,
                duration: 2000,
                essential: mapStore.forceAnimations,
            })
        }
    } else if (points.length > 1) {
        // Multi Points - Fit Bounds
        const bounds = new maplibregl.LngLatBounds()
        points.forEach(p => bounds.extend([p.lng, p.lat]))
        
        if (isFullscreen) {
             map.value.fitBounds(bounds, {
                padding: 50, // Loose padding
                duration: 2000,
                essential: mapStore.forceAnimations,
            })
        } else {
            // Preview Mode - Strict padding to ensure visibility in the window slice
             const p = event.padding ?? mapStore.padding
             map.value.fitBounds(bounds, {
                padding: p,
                duration: 2000,
                essential: mapStore.forceAnimations,
            })
        }
    }
}, { deep: true })

// Keep watching padding for dynamic resizing (e.g. going fullscreen)
watch(() => props.padding, (newPadding) => {
  if (map.value && newPadding) {
    // If we just changed padding, we might want to re-center if tracking something?
    // For now just update padding configuration
    map.value.setPadding(newPadding)
  }
}, { deep: true })

// Watch for user location changes
watch(() => geolocation.userLocation.value, () => {
  updateUserLocation()
}, { deep: true })

// Watch for stops changes - update markers when stops array changes
watch(() => props.stops, () => {
  updateStopMarkers()
}, { deep: true })

// Watch for highlighted line changes - update markers to filter by line
watch(() => props.highlightLineId, () => {
  updateStopMarkers()
})

// Watch for highlighted stop changes - update marker styling
watch(() => props.highlightStopId, () => {
  updateStopMarkers()
})

// Watch for vehicles changes - update vehicle markers
watch(() => props.vehicles, () => {
  updateVehicleMarkers()
}, { deep: true })

function updateStopMarkers() {
  if (!map.value || !isLoaded.value) return
  
  // Clear existing
  stopMarkers.value.forEach(m => m.remove())
  stopMarkers.value = []

  if (!props.stops) return

  for (const stop of props.stops) {
    if (!stop.latitude || !stop.longitude) continue
    
    // Filter by line if specified
    if (props.highlightLineId && !stop.lines?.includes(props.highlightLineId)) continue

    const isHighlighted = stop.id === props.highlightStopId
    const isSelected = stop.id === props.highlightStopId

    const el = document.createElement('div')
    el.className = 'stop-marker'
    
    // Updated marker styling for normal and selected states
    const baseClasses = 'w-6 h-6 rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-all duration-300'
    const normalClasses = 'bg-primary-500 border-2 border-white hover:scale-110'
    const selectedClasses = 'bg-amber-500 scale-125 border-4 border-amber-200 z-50'
    
    el.innerHTML = `
      <div class="${baseClasses} ${isSelected ? selectedClasses : normalClasses}">
        <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4"/>
        </svg>
      </div>
    `

    // Click handler with fullscreen trigger
    el.addEventListener('click', (e) => {
      e.stopPropagation() // Prevent map click
      handleStopClick(stop)
    })

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([stop.longitude, stop.latitude])
      .addTo(map.value!)

    // Z-index: Selected stops highest (40), normal stops (30), buses (20)
    marker.getElement().style.zIndex = isSelected ? '40' : '30'

    stopMarkers.value.push(marker)
  }
}

// --- Interaction Handling ---

const router = useRouter()
// Get lines to display names in the card
const { data: allLines } = await useBusLines() as { data: Ref<BusLine[]> }

// Handle Stop Click
function handleStopClick(stop: BusStop) {
  // 1. Set fullscreen if not active
  if (!mapStore.isFullscreen) {
    mapStore.setFullscreen(true)
  }
  
  // 2. Focus and highlight
  mapStore.focusOnStop(stop)
  emit('stopClick', stop)
}

// Navigate to details
function goToStopDetails() {
  if (mapStore.highlightStopId) {
    mapStore.setFullscreen(false)
     router.push(`/stop/${mapStore.highlightStopId}`)
  }
}

// Navigate to line details
function goToLineDetails(lineId: string) {
  mapStore.setFullscreen(false)
  mapStore.clearHighlight()
  router.push(`/line/${lineId}`)
}

// Get Line metadata helper
function getLineInfo(lineId: string) {
  return allLines.value?.find(l => l.id === lineId)
}

// Setup map interaction listeners to deselect
function setupMapListeners(mapInstance: maplibregl.Map) {
    // Only deselect on explicit user interaction, not programmatic moves
    const onUserInteraction = () => {
        if (mapStore.highlightStopId) {
            mapStore.clearHighlight()
        }
    }
    
    mapInstance.on('dragstart', onUserInteraction)
    mapInstance.on('click', (e) => {
        // Did we click a marker? If so, stop propagation handled in marker
        // If we get here, it's a map click (empty space)
        if (e.defaultPrevented) return
        onUserInteraction()
    })

    // Update store center/zoom on move end
    mapInstance.on('moveend', () => {
        const center = mapInstance.getCenter()
        const zoom = mapInstance.getZoom()
        // Only update if significantly different to avoid loops/noise
        // (Though since we don't watch store.center to flyTo, loop isn't a huge risk, but good practice)
        mapStore.center = [center.lng, center.lat]
        mapStore.zoom = zoom
    })
}




function updateVehicleMarkers() {
  if (!map.value || !isLoaded.value || !props.vehicles) return

  const currentVehicles = new Set<string>()

  for (const vehicle of props.vehicles) {
    if (vehicle.latitude === 0 || vehicle.longitude === 0) continue
    if (props.highlightLineId && vehicle.lineId !== props.highlightLineId) continue

    currentVehicles.add(vehicle.id)
    const newPos: [number, number] = [vehicle.longitude, vehicle.latitude]

    const existing = vehicleMarkers.value.get(vehicle.id)
    
    if (existing) {
      // Animate to new position
      animateMarker(existing.marker, existing.position, newPos)
      existing.position = newPos
    } else {
      // Create new marker
      const el = document.createElement('div')
      el.className = 'vehicle-marker'
      // Bus color based on line
      const lineColor = getLineColor(vehicle.lineId)
      
      el.innerHTML = `
        <div class="relative group z-10 flex flex-col items-center">
          <div class="absolute inset-x-0 top-2 bottom-0 bg-blue-500 rounded-lg animate-ping opacity-25"></div>
          
          <!-- Bus body -->
          <div class="relative z-10 w-9 h-9 ${lineColor} rounded-md border-2 border-white shadow-xl flex items-center justify-center transition-transform group-hover:scale-110">
            <!-- Front window / icon -->
            <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 8a2 2 0 012-2h4a2 2 0 012 2v7a2 2 0 01-2 2h-4a2 2 0 01-2-2V8zm0 7v3a2 2 0 002 2h4a2 2 0 002-2v-3" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l2-2h14l2 2" />
            </svg>
          </div>
          
          <!-- Label below to avoid overlap -->
          <div class="mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm text-gray-900 dark:text-white z-20 whitespace-nowrap">
            L${vehicle.lineId}
          </div>
        </div>
      `

      el.addEventListener('click', () => emit('vehicleClick', vehicle))

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(newPos)
        .addTo(map.value!)

      // Z-index for buses lower than stops
      marker.getElement().style.zIndex = '20'

      vehicleMarkers.value.set(vehicle.id, { marker, position: newPos })
    }
  }

  // Remove markers for vehicles no longer present
  for (const [id, data] of vehicleMarkers.value.entries()) {
    if (!currentVehicles.has(id)) {
      data.marker.remove()
      vehicleMarkers.value.delete(id)
    }
  }
}

function animateMarker(marker: maplibregl.Marker, from: [number, number], to: [number, number]) {
  const duration = 3000 // 3 seconds for smoother glide
  const start = performance.now()

  function animate(time: number) {
    const elapsed = time - start
    const progress = Math.min(elapsed / duration, 1)
    
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3)
    
    const lng = from[0] + (to[0] - from[0]) * eased
    const lat = from[1] + (to[1] - from[1]) * eased
    
    marker.setLngLat([lng, lat])
    
    if (progress < 1) {
      requestAnimationFrame(animate)
    }
  }
  
  requestAnimationFrame(animate)
}

function updateUserLocation() {
  if (!map.value || !isLoaded.value || !props.showUserLocation) return
  
  const loc = geolocation.userLocation.value
  if (!loc) return

  if (userMarker.value) {
    userMarker.value.setLngLat([loc.lng, loc.lat])
  } else {
    const el = document.createElement('div')
    el.innerHTML = `
      <div class="relative">
        <div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
        <div class="absolute inset-0 w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-50"></div>
      </div>
    `
    
    userMarker.value = new maplibregl.Marker({ element: el })
      .setLngLat([loc.lng, loc.lat])
      .addTo(map.value!)
    
    userMarker.value.getElement().style.zIndex = '40'
  }
}

// Expose map instance and methods
defineExpose({
  map,
  flyTo: (center: [number, number], zoom?: number) => {
    map.value?.flyTo({ center, zoom: zoom ?? props.zoom, duration: 2000,
      essential: mapStore.forceAnimations
     })
  },
  fitBounds: (bounds: maplibregl.LngLatBoundsLike, padding?: number | maplibregl.PaddingOptions) => {
    map.value?.fitBounds(bounds, { padding: padding ?? 50, duration: 2000,
      essential: mapStore.forceAnimations
     })
  },
})

onUnmounted(() => {
  map.value?.remove()
})
</script>

<template>
  <div ref="mapContainer" class="w-full h-full relative">
    <!-- Loading overlay -->
    <Transition name="fade">
      <div 
        v-if="!isLoaded"
        class="absolute inset-0 bg-gray-100 dark:bg-gray-900 flex items-center justify-center z-10"
      >
        <div class="text-center">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Cargando mapa...</p>
        </div>
      </div>
    </Transition>
  </div>

  <!-- Selected Stop Card Overlay -->
  <Teleport to="body">
    <Transition name="slide-up">
      <div 
          v-if="selectedStopData" 
          class="fixed bottom-6 left-4 right-4 z-[60] md:left-1/2 md:-translate-x-1/2 md:w-96"
      >
          <UCard :ui="{ body: 'p-0', root: 'ring-1 ring-gray-200 dark:ring-gray-800' }">
              <div class="p-4">
                  <div class="flex items-start justify-between gap-3 mb-3">
                      <div>
                          <h3 class="font-bold text-lg text-gray-900 dark:text-white leading-tight">
                              {{ selectedStopData.name }}
                          </h3>
                          <p class="text-xs text-gray-500 mt-1">
                              Parada {{ selectedStopData.id }}
                          </p>
                      </div>
                      <UButton 
                          color="neutral" 
                          variant="ghost" 
                          icon="i-lucide-x" 
                          size="xs"
                          @click="mapStore.clearHighlight()"
                      />
                  </div>

                  <!-- Lines passing through -->
                  <div v-if="selectedStopData.lines && selectedStopData.lines.length > 0" class="flex flex-wrap gap-2 mb-4">
                      <div 
                          v-for="lineId in selectedStopData.lines" 
                          :key="lineId"
                          class="flex items-center gap-1.5"
                      >
                           <div 
                              class="w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-white"
                              :class="getLineColor(lineId)"
                            >
                              {{ lineId }}
                            </div>
                            <!-- <span class="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[120px]">
                              {{ getLineInfo(lineId)?.destination }}
                            </span> -->
                      </div>
                  </div>

                  <UButton 
                      block 
                      color="primary" 
                      icon="i-lucide-clock"
                      @click="goToStopDetails"
                  >
                      Ver tiempos de llegada
                  </UButton>
              </div>
          </UCard>
      </div>
    </Transition>
  </Teleport>

  <!-- Selected Vehicle Card Overlay -->
  <Teleport to="body">
    <Transition name="slide-up">
      <div 
          v-if="mapStore.selectedVehicle && mapStore.isFullscreen" 
          class="fixed bottom-6 left-4 right-4 z-[60] md:left-1/2 md:-translate-x-1/2 md:w-96"
      >
          <UCard :ui="{ body: 'p-0', root: 'ring-1 ring-gray-200 dark:ring-gray-800' }">
              <!-- Header colored strip with dynamic color -->
              <div class="h-2 w-full" :class="getLineColor(mapStore.selectedVehicle.lineId)"></div>
              
              <div class="p-4">
                  <div class="flex items-start justify-between gap-3 mb-3">
                      <div class="flex items-center gap-3">
                          <div 
                              class="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md"
                              :class="getLineColor(mapStore.selectedVehicle.lineId)"
                          >
                              <span class="text-xl font-bold">{{ mapStore.selectedVehicle.lineId }}</span>
                          </div>
                          <div>
                              <h3 class="font-bold text-lg text-gray-900 dark:text-white leading-tight">
                                  {{ mapStore.selectedVehicle.lineName || `Línea ${mapStore.selectedVehicle.lineId}` }}
                              </h3>
                              <p class="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                  <UIcon name="i-lucide-navigation" class="w-3 h-3" />
                                  {{ mapStore.selectedVehicle.destination || 'En ruta' }}
                              </p>
                          </div>
                      </div>
                      <UButton 
                          color="neutral" 
                          variant="ghost" 
                          icon="i-lucide-x" 
                          size="xs"
                          @click="mapStore.clearHighlight()"
                      />
                  </div>

                  <!-- Vehicle info -->
                  <div class="flex items-center gap-2 mb-4 text-sm text-gray-500">
                      <div class="flex items-center gap-1">
                          <UIcon name="i-lucide-bus" class="w-4 h-4 text-green-500" />
                          <span>Siguiendo vehículo</span>
                      </div>
                      <span class="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                          {{ mapStore.selectedVehicle.id }}
                      </span>
                  </div>

                  <UButton 
                      block 
                      color="primary" 
                      icon="i-lucide-map"
                      @click="goToLineDetails(mapStore.selectedVehicle.lineId)"
                  >
                      Ver recorrido de línea
                  </UButton>
              </div>
          </UCard>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
@reference "tailwindcss";

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%) translateX(0px); /* Mobile default */
  opacity: 0;
}

@media (min-width: 768px) {
  .slide-up-enter-from,
  .slide-up-leave-to {
    transform: translateY(100%) translateX(-50%); /* Desktop centered */
    opacity: 0;
  }
}

.stop-marker,
.vehicle-marker {
  cursor: pointer;
}

.maplibregl-ctrl-logo {
  display: none !important;
}
</style>
