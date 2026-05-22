<script setup lang="ts">
import { MglMap, MglAttributionControl, useMap } from '@indoorequal/vue-maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibregl from 'maplibre-gl'
import type { BusStop, BusVehicle, BusLine } from '~/types/bus'
import { getLineColor, getLineColorHex } from '~/utils/bus'
import { useNow } from '@vueuse/core'

// ===== Map Configuration =====
const MAP_CONFIG = {
  maxZoom: 18,
  minZoom: 10, // Allow zooming out enough for fitBounds on wide lines
  defaultCenter: [-5.6635, 40.9701] as [number, number],
}

// Map key for useMap() composable access
const MAP_KEY = 'busMapKey'

// Zoom-based visibility thresholds
const STOP_VISIBILITY_ZOOM = 0
const VEHICLE_VISIBILITY_ZOOM = 0

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
  center: () => [-5.6635, 40.9701],
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
const mapStore = useMapStore()
const router = useRouter()
const localePath = useLocalePath()

// Map styles
const LIGHT_STYLE = 'https://tiles.openfreemap.org/styles/bright'
const DARK_STYLE = 'https://tiles.openfreemap.org/styles/dark'

const mapStyle = computed(() =>
  colorMode.value === 'dark' ? DARK_STYLE : LIGHT_STYLE
)

// Access map instance via useMap composable
const mapInstance = useMap(MAP_KEY)

// Current zoom level for dynamic sizing
const currentZoom = ref(props.zoom)

// Animation flag: suppresses marker transitions during flyTo/fitBounds
const isAnimating = ref(false)

// Get lines to display names in the card
const { data: allLines } = await useBusLines() as { data: Ref<BusLine[]> }

// ===== Marker State via CSS Cascade =====
// Instead of computing state per-marker (300+ reactive evaluations),
// ===== Marker States =====
function getStopState(stop: BusStop): 'highlighted' | 'dimmed' | 'normal' {
  if (mapStore.selectedRoute && mapStore.selectedRoute.segments) {
    const isRouteStop = mapStore.selectedRoute.segments.some((s: any) => s.from?.id === stop.id || s.to?.id === stop.id)
    return isRouteStop ? 'highlighted' : 'dimmed'
  }
  if (mapStore.highlightStopId) {
    return stop.id === mapStore.highlightStopId ? 'highlighted' : 'dimmed'
  }
  if (mapStore.highlightLineId) {
    return stop.lines?.includes(mapStore.highlightLineId) ? 'highlighted' : 'dimmed'
  }
  if (mapStore.selectedVehicle?.lineId) {
    return stop.lines?.includes(mapStore.selectedVehicle.lineId) ? 'highlighted' : 'dimmed'
  }
  return 'normal'
}

function getVehicleState(vehicle: BusVehicle): 'highlighted' | 'dimmed' | 'normal' {
  if (mapStore.selectedRoute && mapStore.selectedRoute.segments) {
    const isRouteLine = mapStore.selectedRoute.segments.some((s: any) => s.lineId === vehicle.lineId)
    return isRouteLine ? 'highlighted' : 'dimmed'
  }
  if (mapStore.selectedVehicle) {
    return vehicle.id === mapStore.selectedVehicle.id ? 'highlighted' : 'dimmed'
  }
  if (mapStore.highlightLineId) {
    return vehicle.lineId === mapStore.highlightLineId ? 'highlighted' : 'dimmed'
  }
  return 'normal'
}


// ===== Vehicle Staleness Monitoring =====
const now = useNow({ interval: 1000 })
const selectedVehicleAge = computed(() => mapStore.selectedVehicle?.timestamp ? now.value.getTime() - mapStore.selectedVehicle.timestamp : 0)
const isSelectedVehicleStale = computed(() => selectedVehicleAge.value > 30000)
const lastUpdateFormatted = computed(() => {
  if (!mapStore.selectedVehicle?.timestamp) return ''
  const date = new Date(mapStore.selectedVehicle.timestamp)
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
})

const activeVehicles = computed(() => {
  if (!props.vehicles) return []
  const current = now.value.getTime()
  return props.vehicles.filter(v => {
    if (!v.timestamp) return true
    return (current - v.timestamp) <= 600000 // 10 minutes in ms
  })
})

const formattedLineName = computed(() => {
  const name = mapStore.selectedVehicle?.lineName || (mapStore.selectedVehicle?.lineId ? `Línea ${mapStore.selectedVehicle.lineId}` : '')
  if (!name) return ''
  return name.replace(/ - /g, ' - <wbr>')
})

// ===== Selected Stop Card Data =====
const selectedStopData = computed(() => {
  if (!mapStore.highlightStopId || !props.stops) return null
  if (!mapStore.isFullscreen) return null
  return props.stops.find(s => s.id === mapStore.highlightStopId)
})



// Discrete Zoom Scale (CSS custom property — avoids classes on root div)
const zoomScale = computed(() => {
  const z = currentZoom.value
  if (z < 13) return 0.6
  if (z < 15) return 0.8
  return 1.0
})

// Zoom throttling with debounce (avoids jank during flyTo)
// During animations, zoom events are ignored by debounce naturally
let zoomTimeout: ReturnType<typeof setTimeout> | null = null
function updateZoom() {
  if (zoomTimeout) clearTimeout(zoomTimeout)
  zoomTimeout = setTimeout(() => {
    if (mapInstance.map) {
      currentZoom.value = mapInstance.map.getZoom()
    }
  }, isAnimating.value ? 500 : 100) // Longer debounce during flyTo
}

// Rotation/Pitch throttling
let rotateFrame: number | null = null
function updateCamera() {
  if (rotateFrame) return
  rotateFrame = requestAnimationFrame(() => {
    if (mapInstance.map) {
      mapStore.rotation = mapInstance.map.getBearing()
      mapStore.pitch = mapInstance.map.getPitch()
    }
    rotateFrame = null
  })
}

// ===== Map Event Handlers =====
function onMapReady(map: maplibregl.Map) {
  mapStore.mapInstance = map
  emit('mapReady', map)
}

function onMapLoad() {
  const mapRef = mapInstance.map
  if (!mapRef) return

  onMapReady(mapRef)

  // Disable 3D buildings for performance
  const style = mapRef.getStyle()
  if (style?.layers) {
    style.layers.forEach((layer: any) => {
      if (layer.type === 'fill-extrusion') {
        mapRef.setLayoutProperty(layer.id, 'visibility', 'none')
      }
    })
  }

  // Setup interaction listeners
  setupMapListeners(mapRef)

  // Suppress missing image warning from base map styles (like 'wood-pattern')
  mapRef.on('styleimagemissing', (e: any) => {
    // We intentionally ignore missing images from the base style to prevent console spam
    // as we aren't using these textures (like wood-pattern) in our custom layers.
  });

  // Emit for legacy compatibility
  emit('mapReady', mapRef)

  // Force always enabled scrolling
  mapRef.scrollZoom.enable()
  mapRef.boxZoom.enable()
  mapRef.dragRotate.enable()
  mapRef.dragPan.enable()
  mapRef.keyboard.enable()
  mapRef.doubleClickZoom.enable()
  mapRef.touchZoomRotate.enable()

  mapRef.setPadding({ top: 20, bottom: 20, left: 20, right: 20 })

  // Apply padding
  if (props.padding) {
    // mapRef.setPadding(props.padding)
  }

  // Retrigger any pending position
  mapStore.setFullscreen(mapStore.isFullscreen)
}

function setupMapListeners(mapRef: maplibregl.Map) {
  // Only clear highlight on direct map click (NOT on drag)
  mapRef.on('click', (e: any) => {
    if (e.defaultPrevented) return
    if (mapStore.highlightStopId) {
      mapStore.clearHighlight()
    }
  })

  mapRef.on('moveend', () => {
    const center = mapRef.getCenter()
    const zoom = mapRef.getZoom()
    const bearing = mapRef.getBearing()
    const pitch = mapRef.getPitch()
    mapStore.center = [center.lng, center.lat]
    mapStore.zoom = zoom
    mapStore.rotation = bearing
    mapStore.pitch = pitch

    // Sync zoom scale to final level, then re-enable marker transitions
    currentZoom.value = zoom
    if (isAnimating.value) {
      isAnimating.value = false
    }
  })

  // Track rotation & pitch
  mapRef.on('rotate', updateCamera)
  mapRef.on('pitch', updateCamera)

  // Track zoom for dynamic marker sizing - THROTTLED
  mapRef.on('zoom', updateZoom)

  // Deselect vehicle on drag start
  mapRef.on('dragstart', () => {
    if (mapStore.selectedVehicle) {
      mapStore.clearHighlight()
    }
  })
}

watch(() => mapStore.positionEvent, (event) => {
  const m = mapInstance.map
  if (!m || !event) return

  console.log('positionEvent', event)

  // NOTE: Do NOT call m.setPadding({0,0,0,0}) here!
  // flyTo/fitBounds set persistent padding via their `padding` option automatically.
  // Calling setPadding() beforehand would cause an INSTANT visual jump (resetting
  // the old asymmetric padding), leaving almost nothing for flyTo to animate —
  // especially for single-point stops where center/zoom don't change.

  const points = event.points
  const isSinglePoint = points.length === 1

  if (isSinglePoint) {
    const point = points[0]!

    // Use centralized padding calculation — no inline buffers needed
    const finalPadding = mapStore.getEffectivePadding()

    console.log('finalPadding', finalPadding)

    // Safe padding guard
    const containerHeight = m.getContainer().clientHeight || 800
    const containerWidth = m.getContainer().clientWidth || 800
    
    // Validate padding to prevent "null instead of number" crash in MapLibre
    let safePadding = finalPadding
    if (safePadding) {
      if ((safePadding.top || 0) + (safePadding.bottom || 0) >= containerHeight * 0.9) {
        console.warn('Padding vertically exceeds map height, defaulting to 0', safePadding, containerHeight)
        safePadding = { top: 0, bottom: 0, left: 0, right: 0 }
      }
      if ((safePadding.left || 0) + (safePadding.right || 0) >= containerWidth * 0.9) {
        console.warn('Padding horizontally exceeds map width, defaulting to 0', safePadding, containerWidth)
        safePadding = { top: 0, bottom: 0, left: 0, right: 0 }
      }
    }

    console.log('flying to', {
      center: [point.lng, point.lat],
      zoom: event.zoom,
      padding: safePadding,
      bearing: event.bearing ?? m.getBearing(),
      pitch: event.pitch ?? m.getPitch(),
    })

    // Suppress marker transitions during flyTo to prevent jank
    isAnimating.value = true

    m.flyTo({
      center: [point.lng, point.lat],
      zoom: event.zoom,
      padding: safePadding,
      bearing: event.bearing ?? m.getBearing(),
      pitch: event.pitch ?? m.getPitch(),
      duration: event.animate === false ? 0 : 800,
      essential: mapStore.forceAnimations,
    })
  } else if (points.length > 1) {

    const bounds = new maplibregl.LngLatBounds()
    let validPoints = 0
    points.forEach((p: any) => {
      if (typeof p.lng === 'number' && typeof p.lat === 'number' && !isNaN(p.lng) && !isNaN(p.lat)) {
        bounds.extend([p.lng, p.lat])
        validPoints++
      }
    })

    if (validPoints < 2) {
      console.warn("Not enough valid points for fitBounds!", points)
      return
    }

    // Use centralized padding calculation with optional extra padding from the event
    const finalPadding = mapStore.getEffectivePadding(event.padding)
    
    const containerHeight = m.getContainer().clientHeight || 800
    const containerWidth = m.getContainer().clientWidth || 800
    let safePadding = finalPadding
    if (safePadding) {
      if ((safePadding.top || 0) + (safePadding.bottom || 0) >= containerHeight * 0.9) {
        console.warn('fitBounds: Padding vertically exceeds map height, defaulting to 0', safePadding, containerHeight)
        safePadding = { top: 0, bottom: 0, left: 0, right: 0 }
      }
      if ((safePadding.left || 0) + (safePadding.right || 0) >= containerWidth * 0.9) {
        console.warn('fitBounds: Padding horizontally exceeds map width, defaulting to 0', safePadding, containerWidth)
        safePadding = { top: 0, bottom: 0, left: 0, right: 0 }
      }
    }

    // Suppress marker transitions during fitBounds to prevent jank
    isAnimating.value = true

    m.fitBounds(bounds, {
      padding: safePadding,
      bearing: event.bearing ?? m.getBearing(),
      pitch: event.pitch ?? m.getPitch(),
      duration: event.animate === false ? 0 : 800,
      essential: mapStore.forceAnimations,
    })
  }
}, { deep: true })

// Padding is now handled exclusively via flyTo/fitBounds padding parameter.
// No persistent setPadding needed.

// ===== Vehicle Following =====
watch(
  () => mapStore.selectedVehicle,
  (vehicle, oldVehicle) => {
    if (!vehicle) return
    const m = mapInstance.map
    if (!m) return

    // flyTo/easeTo set persistent padding via their padding param — no need to pre-reset
    const finalPadding = mapStore.getEffectivePadding()

    // Case 1: Switched to a DIFFERENT vehicle -> Fly to it
    const idChanged = !oldVehicle || vehicle.id !== oldVehicle.id
    if (idChanged) {
      m.flyTo({
        center: [vehicle.longitude, vehicle.latitude],
        zoom: 16,
        padding: finalPadding,
        duration: 1000,
        essential: mapStore.forceAnimations
      })
      return
    }

    // Case 2: SAME vehicle moved -> Pan smoothly
    const coordsChanged = vehicle.longitude !== oldVehicle.longitude || vehicle.latitude !== oldVehicle.latitude
    if (coordsChanged) {
      m.easeTo({
        center: [vehicle.longitude, vehicle.latitude],
        padding: finalPadding,
        duration: 3000,
        essential: true
      })
    }
  },
  { deep: true }
)

// ===== Stop/Vehicle Handlers =====
function handleStopClick(stop: BusStop) {
  if (mapStore.currentContext === 'route') {
    // In route mode, just set the highlight so the route page watcher catches it
    // Do not enter fullscreen or change the view aggressively
    mapStore.highlightStopId = stop.id
    emit('stopClick', stop)
    return
  }

  if (!mapStore.isFullscreen) {
    mapStore.setFullscreen(true, true) // skip position update — focusOnStop handles it
  }
  // Clear any active line context so the stop takes full visual priority
  if (mapStore.highlightLineId) {
    mapStore.clearHighlight()
  }
  mapStore.focusOnStop(stop)
  emit('stopClick', stop)
}

function handleVehicleClick(vehicle: BusVehicle) {
  emit('vehicleClick', vehicle)
}

function goToStopDetails() {
  if (mapStore.highlightStopId) {
    mapStore.setFullscreen(false)
    router.push(localePath(`/stop/${mapStore.highlightStopId}`))
  }
}

function goToLineDetails(lineId: string) {
  mapStore.setFullscreen(false)
  mapStore.clearHighlight()
  router.push(localePath(`/line/${lineId}`))
}

function getLineInfo(lineId: string) {
  return allLines.value?.find(l => l.id === lineId)
}

// User location
const userLocation = computed(() =>
  props.showUserLocation ? geolocation.userLocation.value : null
)

// Expose map for external access
defineExpose({
  mapInstance,
  flyTo: (center: [number, number], zoom?: number) => {
    mapInstance.map?.flyTo({ center, zoom: zoom ?? props.zoom, duration: 800, essential: mapStore.forceAnimations })
  },
  fitBounds: (bounds: maplibregl.LngLatBoundsLike, padding?: number | maplibregl.PaddingOptions) => {
    mapInstance.map?.fitBounds(bounds, { padding: padding ?? 50, duration: 800, essential: mapStore.forceAnimations })
  },
})
</script>

<template>
  <div class="h-dvh w-dvw" :class="[{ 'map-animating': isAnimating }]" :style="{ '--marker-zoom-scale': zoomScale }">
    <MglMap
      :map-style="mapStyle"
      :center="center"
      :zoom="zoom"
      :max-zoom="MAP_CONFIG.maxZoom"
      :min-zoom="MAP_CONFIG.minZoom"
      :attribution-control="false"
      :render-world-copies="true"
      :map-key="MAP_KEY"
      width="100%"
      height="100%"
      @map:load="onMapLoad"
    >
      <!-- Attribution Control -->
      <MglAttributionControl v-if="showControls && interactive" position="bottom-left" :compact="true" />

      <!-- Route Lines & Custom Lines (GeoJSON Layers) -->
      <MapRouteLinesLayer
        :selected-route="mapStore.selectedRoute"
        :lines-to-draw="mapStore.linesToDraw"
      />

      <!-- Stop Markers -->
      <MapStopMarker
        v-for="stop in (stops || [])"
        :key="stop.id"
        :stop="stop"
        :state="getStopState(stop)"
        @click="handleStopClick"
      />

      <!-- Vehicle Markers -->
      <MapVehicleMarker
        v-for="vehicle in activeVehicles"
        :key="vehicle.id"
        :vehicle="vehicle"
        :now="now"
        :state="getVehicleState(vehicle)"
        @click="handleVehicleClick"
      />

      <!-- User Location -->
      <MapUserLocationMarker
        v-if="userLocation"
        :location="userLocation"
      />
    </MglMap>


    <!-- Selected Stop Card Overlay -->
    <Teleport to="body">
      <Transition name="slide-up">
        <div
          v-if="selectedStopData"
          class="fixed bottom-4 left-4 right-4 z-[60] md:left-1/2 md:-translate-x-1/2 md:w-96 mb-10 md:mb-0"
        >
          <div class="glass-card py-4 px-4">
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
              </div>
            </div>

            <!-- Actions Grid -->
            <div class="grid grid-cols-2 gap-2 mb-3" v-if="false">
              <UButton
                size="sm"
                color="primary"
                variant="soft"
                icon="i-lucide-map-pin"
                @click="() => {
                  mapStore.setRouteOrigin({ id: selectedStopData!.id, name: selectedStopData!.name, type: 'stop', lat: selectedStopData!.latitude!, lng: selectedStopData!.longitude! });
                  router.push('/route');
                  mapStore.setFullscreen(false);
                  mapStore.clearHighlight();
                }"
              >
                Desde aquí
              </UButton>
              <UButton
                size="sm"
                color="primary"
                variant="soft"
                icon="i-lucide-flag"
                @click="() => {
                    mapStore.setRouteDestination({ id: selectedStopData!.id, name: selectedStopData!.name, type: 'stop', lat: selectedStopData!.latitude!, lng: selectedStopData!.longitude! });
                    router.push('/route');
                    mapStore.setFullscreen(false);
                    mapStore.clearHighlight();
                }"
              >
                Hasta aquí
              </UButton>
            </div>

            <UButton
              block
              color="neutral"
              variant="outline"
              icon="i-lucide-clock"
              @click="goToStopDetails"
            >
              Ver tiempos de llegada
            </UButton>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Selected Vehicle Card Overlay -->
    <Teleport to="body">
      <Transition name="slide-up">
        <div
          v-if="mapStore.selectedVehicle && mapStore.isFullscreen"
          class="glass-card fixed bottom-6 left-4 right-4 z-[60] md:left-1/2 md:-translate-x-1/2 md:w-96  mb-10 md:mb-0 overflow-hidden"
        >
            <!-- Header colored strip with dynamic color -->
            <div class="h-2 w-full overflow-hidden" :class="getLineColor(mapStore.selectedVehicle.lineId)" />

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
                    <h3 class="font-bold text-lg text-gray-900 dark:text-white leading-tight" v-html="formattedLineName">
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
                <div class="ml-auto flex items-center gap-1 text-xs" :class="isSelectedVehicleStale ? 'text-red-500 font-bold border border-red-500 px-1.5 py-0.5 rounded' : 'text-gray-400'">
                  <UIcon name="i-lucide-clock" class="w-3 h-3" />
                  <span>{{ lastUpdateFormatted }}</span>
                  
                <UIcon v-if="isSelectedVehicleStale" name="i-lucide-alert-triangle" class="w-3 h-3 ml-0.5" />
                </div>
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
        </div>
      </Transition>
    </Teleport>
</div>
</template>

<style>
@reference "tailwindcss";

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%) translateX(0px);
  opacity: 0;
}

@media (min-width: 768px) {
  .slide-up-enter-from,
  .slide-up-leave-to {
    transform: translateY(100%) translateX(-50%);
    opacity: 0;
  }
}

.stop-marker-wrapper,
.vehicle-marker-wrapper {
  cursor: pointer;
}

.maplibregl-ctrl-logo {
  display: none !important;
}

/* ===== Animation Jank Prevention =====
   When the map is performing a flyTo/fitBounds animation,
   suppress all marker CSS transitions to prevent layout thrashing.
   Markers will snap to their new state instantly, and the map
   camera animation remains smooth. */
:global(.map-animating) .stop-marker-wrapper,
:global(.map-animating) .vehicle-marker-wrapper,
:global(.map-animating) .zoom-scaler {
  transition: none !important;
}
</style>
