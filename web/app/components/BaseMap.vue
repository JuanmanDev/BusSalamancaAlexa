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
  minZoom: 11, // allow further zooming out for smoother flyTo
  defaultCenter: [-5.6635, 40.9701] as [number, number],
  // Expanded maxBounds significantly to prevent flyTo animation aborts when user is nearby but outside the box
  maxBounds: [[-6.50, 40.20], [-4.80, 41.80]] as [[number, number], [number, number]], 
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

// Get lines to display names in the card
const { data: allLines } = await useBusLines() as { data: Ref<BusLine[]> }

// ===== Marker State Derivation =====
function getStopState(stop: BusStop): 'disabled' | 'enabled' | 'highlighted' {
  const isSelected = stop.id === mapStore.highlightStopId
  if (isSelected) return 'highlighted'

  const lineIds = stop.lines || []

  // Dimming logic
  if (mapStore.selectedRoute) {
    const isInRoute = mapStore.selectedRoute.segments.some(s =>
      s.from.id === stop.id || s.to.id === stop.id
    )
    return isInRoute ? 'enabled' : 'disabled'
  }

  if (mapStore.highlightLineId) {
    return lineIds.includes(mapStore.highlightLineId) ? 'enabled' : 'disabled'
  }

  if (mapStore.highlightStopId) {
    return 'disabled'
  }

  return 'enabled'
}

function getVehicleState(vehicle: BusVehicle): 'disabled' | 'enabled' | 'highlighted' {
  if (mapStore.selectedVehicle?.id === vehicle.id) return 'highlighted'

  if (mapStore.selectedRoute) {
    const routeLines = mapStore.selectedRoute.segments
      .filter(s => s.type === 'bus')
      .map(s => s.lineId)
    return routeLines.includes(vehicle.lineId) ? 'enabled' : 'disabled'
  }

  if (props.highlightLineId) {
    return vehicle.lineId === props.highlightLineId ? 'enabled' : 'disabled'
  }

  return 'enabled'
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



// Discrete Zoom Classes (limit style recalculations to 3 steps)
const zoomLevelClass = computed(() => {
  const z = currentZoom.value
  if (z < 13) return 'z-low'
  if (z < 15) return 'z-med'
  return 'z-high'
})

// Zoom throttling (updates CSS vars efficiently)
let zoomFrame: number | null = null
function updateZoom() {
  if (zoomFrame) return
  zoomFrame = requestAnimationFrame(() => {
    if (mapInstance.map) {
      currentZoom.value = mapInstance.map.getZoom()
    }
    zoomFrame = null
  })
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
  map.setMaxBounds(MAP_CONFIG.maxBounds)
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

    // point.lng += 0.00001
    console.log('flying to', {
      center: [point.lng, point.lat],
      zoom: event.zoom,
      padding: finalPadding,
      bearing: event.bearing ?? m.getBearing(),
      pitch: event.pitch ?? m.getPitch(),
      duration: 800,
      essential: mapStore.forceAnimations,
    })

    m.flyTo({
      center: [point.lng, point.lat],
      zoom: event.zoom,
      padding: finalPadding,
      bearing: event.bearing ?? m.getBearing(),
      pitch: event.pitch ?? m.getPitch(),
      duration: 800,
      essential: mapStore.forceAnimations,
    })
  } else if (points.length > 1) {

    const bounds = new maplibregl.LngLatBounds()
    points.forEach(p => bounds.extend([p.lng, p.lat]))

    // Use centralized padding calculation with optional extra padding from the event
    const finalPadding = mapStore.getEffectivePadding(event.padding)

    m.fitBounds(bounds, {
      padding: finalPadding,
      bearing: event.bearing ?? m.getBearing(),
      pitch: event.pitch ?? m.getPitch(),
      duration: 800,
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
        essential: true
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
    router.push(`/stop/${mapStore.highlightStopId}`)
  }
}

function goToLineDetails(lineId: string) {
  mapStore.setFullscreen(false)
  mapStore.clearHighlight()
  router.push(`/line/${lineId}`)
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
  <div class="h-dvh w-dvw">
    <MglMap
      :map-style="mapStyle"
      :center="center"
      :zoom="zoom"
      :max-zoom="MAP_CONFIG.maxZoom"
      :min-zoom="MAP_CONFIG.minZoom"
      :attribution-control="false"
      :render-world-copies="false"
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

      <!-- Stop Markers (hidden below zoom threshold) -->
      <MapStopMarker
        v-for="stop in (stops || [])"
        :key="stop.id"
        :stop="stop"
        :state="getStopState(stop)"
        @click="handleStopClick"
      />

      <!-- Vehicle Markers (hidden below zoom threshold) -->
      <MapVehicleMarker
        v-for="vehicle in (vehicles || [])"
        :key="vehicle.id"
        :vehicle="vehicle"
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
</style>
