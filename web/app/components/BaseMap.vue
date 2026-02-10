<script setup lang="ts">
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { BusStop, BusVehicle, BusLine } from '~/types/bus'
import { generateStopMarkerSVG } from '~/utils/bus'

// ===== Map Configuration =====
// These constants control map features for performance optimization
const MAP_CONFIG = {
  // Performance settings
  disable3DBuildings: true,  // Disable 3D buildings for better mobile performance
  disablePOILabels: false,   // Keep POI labels for orientation
  
  // Zoom limits
  maxZoom: 18,
  minZoom: 10,
  
  // Default center: Salamanca Plaza Mayor
  defaultCenter: [-5.6635, 40.9701] as [number, number],
}

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
const LIGHT_STYLE = 'https://tiles.openfreemap.org/styles/bright'
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
    maxZoom: MAP_CONFIG.maxZoom,
    minZoom: MAP_CONFIG.minZoom,
    renderWorldCopies: false,
  })

  // Add Route Source and Layers when map loads
  mapInstance.on('load', () => {
      // Source for route lines
      mapInstance.addSource('route-path', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
      })

      // Walking Layer (Dashed)
      mapInstance.addLayer({
          id: 'route-walk',
          type: 'line',
          source: 'route-path',
          filter: ['==', '$type', 'LineString'],
          layout: {
              'line-join': 'round',
              'line-cap': 'round'
          },
          paint: {
              'line-color': colorMode.value === 'dark' ? '#d1d5db' : '#374151', // Inverse of theme
              'line-width': 4,
              'line-dasharray': [0, 2] // Dotted/Dashed
          }
      })
      
      // Bus Layer (Solid)
      mapInstance.addLayer({
          id: 'route-bus',
          type: 'line',
          // ...
          source: 'route-path',
          layout: {
              'line-join': 'round',
              'line-cap': 'round'
          },
          paint: {
              'line-color': ['get', 'color'],
              'line-width': 5
          }
      })
  })

  if (props.showControls && props.interactive) {
    mapInstance.addControl(new maplibregl.NavigationControl(), 'bottom-right')
    mapInstance.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')
  }

  mapInstance.on('load', () => {
    isLoaded.value = true
    map.value = markRaw(mapInstance)
    
    // Disable 3D buildings for performance
    if (MAP_CONFIG.disable3DBuildings) {
      disableBuildingLayers(mapInstance)
    }
    
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

    // Force always enabled
    map.value.scrollZoom.enable()
    map.value.boxZoom.enable()
    map.value.dragRotate.enable()
    map.value.dragPan.enable()
    map.value.keyboard.enable()
    map.value.doubleClickZoom.enable()
    map.value.touchZoomRotate.enable()
  })
})

// Watch for theme changes
watch(mapStyle, (newStyle) => {
  if (map.value) {
    map.value.setStyle(newStyle)
    // Re-add layers if style changes (MapLibre removes layers on style change? Yes, usually)
    // But mapStyle defaults to style URL. 
    // Actually, usually we need to wait for style.load before adding layers again.
    // Ideally we shouldn't switch style URL dynamically if we can avoid it or handle "styledata" event.
    // However, existing code does `setStyle`.
  }
})

// Update walking line color when theme changes
watch(() => colorMode.value, (mode) => {
    if (map.value && map.value.getLayer('route-walk')) {
       // Inverse: Dark Theme -> Light Line, Light Theme -> Dark Line
       const color = mode === 'dark' ? '#d1d5db' : '#374151' 
       map.value.setPaintProperty('route-walk', 'line-color', color)
    }
})

// Watch for interactive prop changes - enable/disable interactions
watch(() => props.interactive, (isInteractive) => {
    // ...
  if (!map.value) return
  
  if (isInteractive || true) {
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

const mapStore = useMapStore()
const router = useRouter()
// Get lines to display names in the card
const { data: allLines } = await useBusLines() as { data: Ref<BusLine[]> }

// Watch for store position events (flyTo, fitBounds)
watch(() => mapStore.positionEvent, (event) => {
    if (!map.value || !event) return
    
    const isFullscreen = mapStore.isFullscreen
    const points = event.points

    const isSinglePoint = points.length === 1
    
    if (isSinglePoint) {
        const point = points[0]!
        const targetZoom = event.zoom ?? 15
        
        const p = isFullscreen ? 0 : (event.padding ?? mapStore.padding)

        map.value.flyTo({
            center: [point.lng, point.lat],
            zoom: targetZoom,
            padding: p,
            duration: 2000,
            essential: mapStore.forceAnimations,
        })
    } else if (points.length > 1) {
        const bounds = new maplibregl.LngLatBounds()
        points.forEach(p => bounds.extend([p.lng, p.lat]))
        
        const p = isFullscreen ? 50 : (event.padding ?? mapStore.padding)
        
        map.value.fitBounds(bounds, {
            padding: p,
            duration: 2000,
            essential: mapStore.forceAnimations,
        })
    }
}, { deep: true })

// Keep watching padding
watch(() => props.padding, (newPadding) => {
  if (map.value && newPadding) {
    map.value.setPadding(newPadding)
  }
}, { deep: true })

// Watch for user location changes
watch(() => geolocation.userLocation.value, () => {
  updateUserLocation()
}, { deep: true })

// Watch for stops changes
watch(() => props.stops, () => {
  updateStopMarkers()
}, { deep: true })

// Watch for highlighted line/stop changes
watch(() => [props.highlightLineId, props.highlightStopId], () => {
  updateStopMarkers()
  updateVehicleMarkers()
})

// Watch for vehicles changes
watch(() => props.vehicles, () => {
  updateVehicleMarkers()
}, { deep: true })

// Watch for selected route OR lines to draw
watch([() => mapStore.selectedRoute, () => mapStore.linesToDraw], ([route, lines]) => {
    if (!map.value || !isLoaded.value) return
    
    const source = map.value.getSource('route-path') as maplibregl.GeoJSONSource
    const features: any[] = []
    
    // 1. Process Route (Navigation)
    if (route) {
        route.segments.forEach(seg => {
            const coords = seg.geometry?.map(p => [p.lng, p.lat]) || 
                           [[seg.from.location.lng, seg.from.location.lat], [seg.to.location.lng, seg.to.location.lat]]
            
            if (seg.type === 'walk') {
                 features.push({
                    type: 'Feature',
                    properties: { type: 'walk' },
                    geometry: {
                        type: 'LineString',
                        coordinates: coords
                    }
                })
            } else if (seg.type === 'bus') {
                 const hex = getLineColorHex(seg.lineId || '0')
                 features.push({
                    type: 'Feature',
                    properties: { type: 'bus', color: hex },
                    geometry: {
                        type: 'LineString',
                        coordinates: coords
                    }
                })
            }
        })
    }

    // 2. Process Custom Lines
    if (lines && lines.length > 0) {
        lines.forEach(line => {
            const coords = line.points.map(p => [p.lng, p.lat])
            features.push({
                type: 'Feature',
                properties: { type: 'bus', color: line.color },
                geometry: {
                    type: 'LineString',
                    coordinates: coords
                }
            })
        })
    }

    if (source) {
        source.setData({ type: 'FeatureCollection', features })
    }
    
    updateStopMarkers()
    updateVehicleMarkers()
})

// Helper: Get hex color for line
function getLineColorHex(id: string) {
    const colors = ['#3B82F6', '#A855F7', '#22C55E', '#F97316', '#EC4899', '#14B8A6']
    const idx = parseInt(id || '0') % colors.length
    return colors[idx]
}

function disableBuildingLayers(mapInstance: maplibregl.Map) {
  const style = mapInstance.getStyle()
  if (style?.layers) {
    style.layers.forEach(layer => {
      if (layer.type === 'fill-extrusion') {
        mapInstance.setLayoutProperty(layer.id, 'visibility', 'none')
      }
    })
  }
}

function updateStopMarkers() {
  if (!map.value || !isLoaded.value) return
  
  stopMarkers.value.forEach(m => m.remove())
  stopMarkers.value = []

  if (!props.stops) return

  for (const stop of props.stops) {
    if (!stop.latitude || !stop.longitude) continue

    const isSelected = stop.id === mapStore.highlightStopId
    const lineIds = stop.lines || []
    
    // Dimming Logic
    let isDimmed = false
    if (mapStore.selectedRoute) {
        const isInRoute = mapStore.selectedRoute.segments.some(s => 
            s.from.id === stop.id || s.to.id === stop.id
        )
        isDimmed = !isInRoute
    } else if (mapStore.highlightLineId) {
        isDimmed = !lineIds.includes(mapStore.highlightLineId)
    } else if (mapStore.highlightStopId) {
        isDimmed = stop.id !== mapStore.highlightStopId
    }

    const markerSize = isSelected ? 36 : 24
    const svg = generateStopMarkerSVG(lineIds, markerSize, isSelected)

    const el = document.createElement('div')
    el.className = 'stop-marker'
    
    const dimClasses = 'opacity-30 grayscale scale-75'
    const selectedClasses = 'scale-125 z-50'

    el.innerHTML = `
      <div class="relative transition-all duration-300 cursor-pointer ${isSelected ? selectedClasses : (isDimmed ? dimClasses : 'hover:scale-110')}">
        ${svg}
        ${isSelected ? '<div class="absolute inset-0 rounded-full ring-4 ring-amber-400 ring-opacity-60 animate-pulse" style="margin: -4px;"></div>' : ''}
      </div>
    `

    el.addEventListener('click', (e) => {
      e.stopPropagation()
      handleStopClick(stop)
    })

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([stop.longitude, stop.latitude])
      .addTo(map.value!)

    marker.getElement().style.zIndex = isSelected ? '40' : '30'
    stopMarkers.value.push(marker)
  }
}

// Handle Stop Click
function handleStopClick(stop: BusStop) {
  if (!mapStore.isFullscreen) {
    mapStore.setFullscreen(true)
  }
  mapStore.focusOnStop(stop)
  emit('stopClick', stop)
}

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

// Helper for template
function getLineInfo(lineId: string) {
  return allLines.value?.find(l => l.id === lineId)
}

function setupMapListeners(mapInstance: maplibregl.Map) {
    const onUserInteraction = () => {
        if (mapStore.highlightStopId) {
            mapStore.clearHighlight()
        }
    }
    
    mapInstance.on('dragstart', onUserInteraction)
    mapInstance.on('click', (e) => {
        if (e.defaultPrevented) return
        onUserInteraction()
    })

    mapInstance.on('moveend', () => {
        const center = mapInstance.getCenter()
        const zoom = mapInstance.getZoom()
        mapStore.center = [center.lng, center.lat]
        mapStore.zoom = zoom
    })
}

function updateVehicleMarkers() {
  if (!map.value || !isLoaded.value || !props.vehicles) return

  const currentVehicles = new Set<string>()

  for (const vehicle of props.vehicles) {
    if (vehicle.latitude === 0 || vehicle.longitude === 0) continue
    
    // Dimming Logic for Vehicles
    let isDimmed = false
    if (mapStore.selectedRoute) {
        // Is this vehicle's line part of the route?
        const routeLines = mapStore.selectedRoute.segments
            .filter(s => s.type === 'bus')
            .map(s => s.lineId)
        isDimmed = !routeLines.includes(vehicle.lineId)
    } else if (props.highlightLineId) {
        // Show all vehicles, but dim those not matching the highlighted line
        isDimmed = vehicle.lineId !== props.highlightLineId
    }

    currentVehicles.add(vehicle.id)
    const newPos: [number, number] = [vehicle.longitude, vehicle.latitude]

    const existing = vehicleMarkers.value.get(vehicle.id)
    
    if (existing) {
      // Animate to new position
      animateMarker(existing.marker, existing.position, newPos)
      existing.position = newPos
      
      // Update styling
      const isSelected = mapStore.selectedVehicle?.id === vehicle.id
      const el = existing.marker.getElement()
      const halo = el.querySelector('.vehicle-halo')
      const body = el.querySelector('.vehicle-body')
      const container = el.querySelector('.group') // Wrapper
      
      if (container) {
          // Reset classes
          container.className = `relative group z-10 flex flex-col items-center transition-all duration-300 ${isDimmed ? 'opacity-30 grayscale scale-75' : 'opacity-100'}`
          // Adjust Z-Index: Normal/Dimmed Stops are 30. Selected Stops 40. 
          // We want Buses > Dimmed Stops. 
          // So Buses = 35. (Selected Bus = 45 maybe?)
          // Let's set z-index on the marker element, not the inner container.
      }
      
      // Update Z-Index dynamically
      existing.marker.getElement().style.zIndex = isSelected ? '45' : '35'

      if (isSelected) {
          halo?.classList.remove('opacity-25', 'animate-ping')
          halo?.classList.add('opacity-100', 'ring-4', 'ring-yellow-400', 'ring-opacity-50') // Solid highlight ring
          body?.classList.add('scale-125', 'ring-2', 'ring-yellow-400')
      } else {
           halo?.classList.add('opacity-25', 'animate-ping')
           halo?.classList.remove('opacity-100', 'ring-4', 'ring-yellow-400', 'ring-opacity-50')
           body?.classList.remove('scale-125', 'ring-2', 'ring-yellow-400')
      }

    } else {
      // Create new marker
      const el = document.createElement('div')
      el.className = 'vehicle-marker transition-opacity duration-500 ease-in-out opacity-0' // Start invisible for fade-in
      
      // Request animation frame to fade in
      requestAnimationFrame(() => {
          el.classList.remove('opacity-0')
          el.classList.add('opacity-100')
      })

      // Bus color based on line
      const lineColor = getLineColor(vehicle.lineId)
      
      const dimClasses = 'opacity-30 grayscale scale-75'
      
      el.innerHTML = `
        <div class="relative group z-10 flex flex-col items-center ${isDimmed ? dimClasses : 'opacity-100'} transition-all duration-300">
          <!-- Selection/Ping Halo -->
          <div class="vehicle-halo absolute inset-0 -m-1 rounded-xl animate-ping opacity-25 ${lineColor}"></div>
          
          <!-- Bus body (Pill shape) -->
          <div class="vehicle-body relative z-10 flex items-center gap-1.5 px-2 py-1 ${lineColor} rounded-xl border-2 border-white shadow-md transition-all duration-300 group-hover:scale-110 min-w-[3rem] justify-center">
             <!-- Tiny Bus Icon -->
             <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white w-3 h-3"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>
             <span class="text-white font-bold text-xs leading-none">${vehicle.lineId}</span>
          </div>
          
          <!-- Arrow indicating direction -->
           ${vehicle.bearing ? `<div class="absolute -bottom-1 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-white transform rotate-${vehicle.bearing}"></div>` : ''}
        </div>
      `

      el.addEventListener('click', (e) => {
          e.stopPropagation()
          // Always fetch the LATEST vehicle data from props
          const latest = props.vehicles?.find(v => v.id === vehicle.id) || vehicle
          emit('vehicleClick', latest)
      })

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(newPos)
        .addTo(map.value!)

      // Z-index: Stops (30), Selected Stops (40).
      // We want Buses > dimmed stops (30).
      // So Buses = 35.
      marker.getElement().style.zIndex = '35'

      vehicleMarkers.value.set(vehicle.id, { marker, position: newPos })
    }
  }

  // Remove markers for vehicles no longer present with fade out
  for (const [id, data] of vehicleMarkers.value.entries()) {
    if (!currentVehicles.has(id)) {
      const el = data.marker.getElement()
      el.classList.add('opacity-0')
      el.classList.remove('opacity-100')
      
      // Wait for transition to finish before removing
      setTimeout(() => {
        data.marker.remove()
      }, 500)
      
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

.animate-spin-slow {
    animation: spin 3s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}
</style>
