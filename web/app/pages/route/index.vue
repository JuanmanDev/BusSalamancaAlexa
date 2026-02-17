<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import type { BusStop } from '~/types/bus'

const router = useRouter()
const route = useRoute()
const { fetchStops } = useBusService()
const { userLocation } = useGeolocation()
const mapStore = useMapStore()

// State - Now using mapStore
// Local refs only for inputs (v-model needs local state for typing, sync on change/blur?)
// Or we can use computed with get/set if we want direct store binding, but debouncing search needs local query.
const originQuery = ref(mapStore.routeOrigin?.name || '')
const destQuery = ref(mapStore.routeDestination?.name || '')

// Sync queries if store updates externally (e.g. swap)
watch(() => mapStore.routeOrigin, (newVal) => {
    if (newVal && newVal.name !== originQuery.value) {
        originQuery.value = newVal.name
    } else if (!newVal) {
        originQuery.value = ''
    }
})

watch(() => mapStore.routeDestination, (newVal) => {
    if (newVal && newVal.name !== destQuery.value) {
        destQuery.value = newVal.name
    } else if (!newVal) {
        destQuery.value = ''
    }
})

// Search Results
interface SearchResult {
    id: string
    name: string
    secondary?: string
    type: 'stop' | 'address' | 'user'
    icon: string
    lat: number
    lng: number
    data?: any
}

const suggestions = ref<SearchResult[]>([])
const isSearching = ref(false)
const activeField = ref<'origin' | 'destination' | null>(null)

// Load all stops once
const allStops = ref<BusStop[]>([])
onMounted(async () => {
    // Set map context first!
    mapStore.setContextToRoutePage()
    
    allStops.value = await fetchStops()
    
    // 0. Restore user location from URL if available (Persistence)
    if (!userLocation.value && route.query.currentLat && route.query.currentLng) {
        try {
            const lat = parseFloat(route.query.currentLat as string)
            const lng = parseFloat(route.query.currentLng as string)
            if (!isNaN(lat) && !isNaN(lng)) {
                userLocation.value = { lat, lng }
            }
        } catch (e) {
            console.error('Failed to parse location from URL', e)
        }
    }

    // Check for query params to pre-fill
    if (route.query.origin) {
        const originId = route.query.origin as string
        const stop = allStops.value.find(s => s.id === originId)
        if (stop && stop.latitude && stop.longitude) {
             const loc = {
                id: stop.id,
                name: stop.name,
                type: 'stop' as const,
                lat: stop.latitude,
                lng: stop.longitude
            }
            mapStore.setRouteOrigin(loc)
            originQuery.value = stop.name
        }
    } else if (!mapStore.routeOrigin) {
        // Default origin to user location if available AND not already set and no query param
        if (userLocation.value) {
            const loc = {
                id: 'user',
                name: 'Mi ubicación',
                type: 'user' as const,
                lat: userLocation.value.lat,
                lng: userLocation.value.lng
            }
            mapStore.setRouteOrigin(loc)
            originQuery.value = 'Mi ubicación'
        }
    }

    if (route.query.destination) {
        const destId = route.query.destination as string
        const stop = allStops.value.find(s => s.id === destId)
        if (stop && stop.latitude && stop.longitude) {
             const loc = {
                id: stop.id,
                name: stop.name,
                type: 'stop' as const,
                lat: stop.latitude,
                lng: stop.longitude
            }
            mapStore.setRouteDestination(loc)
            destQuery.value = stop.name
        }
    }
})

// Sync user location to URL for persistence
watch(userLocation, (newLoc) => {
    if (newLoc) {
        router.replace({
            query: {
                ...route.query,
                currentLat: newLoc.lat.toFixed(6),
                currentLng: newLoc.lng.toFixed(6)
            }
        })
    }
}, { immediate: true })

// Ensure we leave clean state when navigating away
onBeforeRouteLeave((to, from, next) => {
    // If we are just picking a location, don't reset standard flags? 
    // Actually map selection is handled via overlay, so route leave means real navigation.
    // mapStore.setFullscreen(false) // handled by next page context usually
    next()
})

const isPickingLocation = ref(false)
const pickingField = ref<'origin' | 'destination' | null>(null)

function startMapSelection(field: 'origin' | 'destination') {
    activeField.value = field // Keep active field to know where to put the result
    pickingField.value = field
    isPickingLocation.value = true
    mapStore.setFullscreen(true)
}

function confirmMapSelection() {
    if (!pickingField.value) return

    const [lng, lat] = mapStore.center
    const location = {
        id: `loc:${lat.toFixed(5)},${lng.toFixed(5)}`,
        name: 'Ubicación seleccionada',
        type: 'map' as const,
        lat,
        lng
    }

    if (pickingField.value === 'origin') {
        mapStore.setRouteOrigin(location)
        originQuery.value = location.name
    } else {
        mapStore.setRouteDestination(location)
        destQuery.value = location.name
    }

    cancelMapSelection()
}

function cancelMapSelection() {
    isPickingLocation.value = false
    pickingField.value = null
    mapStore.setFullscreen(false)
}

// Watch for map stop clicks to select as origin/destination
watch(() => mapStore.highlightStopId, (newStopId) => {
    // Only if we have an active field focused (user intends to pick)
    // OR if we are explicitly in "picking mode" (but picking mode usually implies center pin?)
    // Let's support clicking a stop ANY time if an input is focused or we are in map picking mode.
    
    if (newStopId && (activeField.value || isPickingLocation.value)) {
        const stop = allStops.value.find(s => s.id === newStopId)
        if (stop && stop.latitude && stop.longitude) {
             const loc = {
                id: stop.id,
                name: stop.name,
                type: 'stop' as const,
                lat: stop.latitude,
                lng: stop.longitude
            }

            if (activeField.value === 'origin' || pickingField.value === 'origin') {
                mapStore.setRouteOrigin(loc)
                originQuery.value = stop.name
            } else {
                mapStore.setRouteDestination(loc)
                destQuery.value = stop.name
            }
            
            // Clear the map highlight so it doesn't look like we just "viewed" it
            mapStore.clearHighlight()
            // Close suggestions
            suggestions.value = []
            
            // If we were in picking mode, exit it
            if (isPickingLocation.value) {
                cancelMapSelection()
            }
        }
    }
})


// Search Logic
const performSearch = useDebounceFn(async (query: string) => {
    // If query matches current selection, likely no need to search, but user might be typing to change
    isSearching.value = true
    const results: SearchResult[] = []
    
    if (!query || query.length < 2) {
        suggestions.value = [{
            id: 'map-picker',
            name: 'Seleccionar en el mapa',
            type: 'map' as any,
            icon: 'i-lucide-map',
            lat: 0,
            lng: 0
        }]
        isSearching.value = false
        return
    }

    const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

    // 1. Local Stops Search (Fuzzy-ish)
    const stopMatches = allStops.value.filter(s => {
        const name = s.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        return (name.includes(q) || s.id.includes(q)) && (s.latitude !== undefined && s.longitude !== undefined)
    }).slice(0, 5)

    stopMatches.forEach(stop => {
        if (stop.latitude && stop.longitude) {
            results.push({
                id: stop.id,
                name: stop.name,
                secondary: `Parada ${stop.id}`,
                type: 'stop',
                icon: 'i-lucide-bus',
                lat: stop.latitude,
                lng: stop.longitude,
                data: stop
            })
        }
    })

    // 2. Nominatim Address Search
    try {
        // Append "Salamanca" to ensure local results
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Salamanca, España')}&format=json&limit=5&addressdetails=1`
        
        const response = await fetch(nominatimUrl)
        if (response.ok) {
            const data = await response.json()
            data.forEach((item: any) => {
                results.push({
                    id: `osm-${item.place_id}`,
                    name: item.name || item.address.road || item.display_name.split(',')[0],
                    secondary: item.display_name,
                    type: 'address',
                    icon: 'i-lucide-map-pin',
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lon),
                    data: item
                })
            })
        }
    } catch (e) {
        console.error('Nominatim error', e)
    }
    
    // 4. Add map option at the START (so it appears at bottom with flex-col-reverse)
    results.unshift({
        id: 'map-picker',
        name: 'Seleccionar en el mapa',
        type: 'map' as any,
        icon: 'i-lucide-map',
        lat: 0,
        lng: 0
    })

    suggestions.value = results
    isSearching.value = false
}, 300)

// Watchers
watch(originQuery, (val) => {
    // Only search if user is actively typing (focused)
    if (activeField.value === 'origin' && val !== mapStore.routeOrigin?.name) {
         performSearch(val)
    }
})

watch(destQuery, (val) => {
    if (activeField.value === 'destination' && val !== mapStore.routeDestination?.name) {
         performSearch(val)
    }
})

function onFocus(field: 'origin' | 'destination') {
    activeField.value = field
    suggestions.value = [] // clear prompt
    const val = field === 'origin' ? originQuery.value : destQuery.value
    // Trigger immediate search to show "Select on map" if empty
    performSearch(val || '') 
}

function selectResult(result: SearchResult) {
    if (result.id === 'map-picker' && activeField.value) {
        startMapSelection(activeField.value)
        return
    }

    const location = {
        id: result.id,
        name: result.name,
        type: result.type as any,
        lat: result.lat,
        lng: result.lng
    }

    if (activeField.value === 'origin') {
        mapStore.setRouteOrigin(location)
        originQuery.value = result.name
    } else {
        mapStore.setRouteDestination(location)
        destQuery.value = result.name
    }
    activeField.value = null
    suggestions.value = []
}

function searchRoute() {
    if (!mapStore.routeOrigin || !mapStore.routeDestination) return

    const query: any = {}
    
    // Origin
    if (mapStore.routeOrigin.type === 'stop') {
        query.origin = mapStore.routeOrigin.id // pass ID for stops
    } else if (mapStore.routeOrigin.type === 'user') {
        query.origin = 'user'
    } else {
        query.origin = `loc:${mapStore.routeOrigin.lat},${mapStore.routeOrigin.lng}`
        query.originName = mapStore.routeOrigin.name
    }
    
    // Destination
    if (mapStore.routeDestination.type === 'stop') {
        query.destination = mapStore.routeDestination.id
    } else {
        query.destination = `loc:${mapStore.routeDestination.lat},${mapStore.routeDestination.lng}`
        query.destinationName = mapStore.routeDestination.name
    }

    router.push({
        path: '/route/results',
        query
    })
}

function swappoints() {
    mapStore.swapRoutePoints()
}

</script>

<template>
    
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-4 " id="mapPreviewContainer__">

    <MapPreview />


    <!-- Beta Warning -->
    <UAlert
      icon="i-lucide-flask-conical"
      color="warning"
      variant="subtle"
      title="Rutas en fase Beta"
      description="Esta función es experimental y puede contener errores. Úsala con precaución y verifica siempre los horarios oficiales. Es posible que no ofrezcan la ruta óptima."
      class="mb-4 relative z-10 shadow-lg bg-white/50 dark:bg-gray-900/50 backdrop-blur-md"
    />
    
    <!-- Main visible content wrapper -->
    <div class="h-full flex flex-col pointer-events-auto relative z-10">
        
        <!-- Header Card -->
        <div class="glass-card p-4 pt-4">
             <div class="max-w-md mx-auto relative">
                <div class="flex items-center gap-2 mb-4">
                    <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" @click="router.back()" />
                    <h1 class="text-lg font-bold text-gray-900 dark:text-white">Planificar Ruta</h1>
                </div>

                <div class="flex gap-3">
                     <!-- Vertical dots connector -->
                     <div class="flex flex-col items-center pt-3 pb-3 gap-1">
                         <div class="w-3 h-3 rounded-full border-[3px] border-blue-500 bg-white dark:bg-gray-900"></div>
                         <div class="w-0.5 grow bg-gray-200 dark:bg-gray-700 my-1 border-l border-dashed border-gray-300 dark:border-gray-600"></div>
                         <div class="w-3 h-3 rounded-full border-[3px] border-red-500 bg-white dark:bg-gray-900"></div>
                     </div>
                     
                     <div class="flex-1 space-y-3">
                         <UInput 
                            v-model="originQuery"
                            placeholder="Origen"
                            icon="i-lucide-circle"
                            class="w-full"
                            autofocus
                            @focus="onFocus('origin')"
                         >
                            <template #trailing>
                                <UButton v-if="originQuery && activeField === 'origin'" icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="originQuery = ''; mapStore.setRouteOrigin(null)" />
                            </template>
                         </UInput>
                         
                         <UInput 
                            v-model="destQuery"
                            placeholder="Destino"
                            icon="i-lucide-map-pin"
                            class="w-full"
                            @focus="onFocus('destination')"
                         >
                             <template #trailing>
                                <UButton v-if="destQuery && activeField === 'destination'" icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="destQuery = ''; mapStore.setRouteDestination(null)" />
                            </template>
                         </UInput>
                     </div>

                     <!-- Swap Button -->
                     <div class="flex items-center">
                         <UButton icon="i-lucide-arrow-up-down" color="neutral" variant="ghost" @click="swappoints" />
                     </div>
                     </div>
                     
                     <!-- Search Action -->
                     <div class="flex items-center justify-end w-full pt-2" v-if="mapStore.routeOrigin && mapStore.routeDestination">
                        <UButton 
                            label="Buscar ruta" 
                            icon="i-lucide-search"
                            size="md"
                            color="primary"
                            block
                            @click="searchRoute"
                        />
                     </div>
                </div>
             </div>


        <!-- Suggestions List -->
        <div class="flex-1 overflow-y-auto max-w-md mx-auto w-full p-2 mt-4 glass-card" v-if="activeField || suggestions.length > 0">
            
            <!-- Loading -->
            <div v-if="isSearching" class="py-4 text-center text-gray-500">
                <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin mx-auto mb-2" />
                <p class="text-sm">Buscando...</p>
            </div>

            <!-- Results -->
            <div v-else-if="suggestions.length > 0" class="space-y-1">
                <button 
                    v-for="item in suggestions" 
                    :key="item.id"
                    class="w-full text-left p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-3 transition-colors active:bg-black/10 dark:active:bg-white/20"
                    @click="selectResult(item)"
                >
                    <div class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                        <UIcon :name="item.icon" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                        <p class="font-medium text-gray-900 dark:text-white">{{ item.name }}</p>
                        <p class="text-xs text-gray-500 truncate" v-if="item.secondary">{{ item.secondary }}</p>
                    </div>
                </button>
            </div>
            
            <!-- No results -->
            <div v-else-if="activeField && !isSearching && suggestions.length === 0 && (activeField === 'origin' ? originQuery : destQuery).length > 2" class="py-10 text-center text-gray-500">
                <p>No se encontraron resultados</p>
            </div>
        </div>
        
        <!-- Search Button (when ready) -->
        <div v-if="!activeField && mapStore.routeOrigin && mapStore.routeDestination" class="mt-4 flex justify-center">
             <UButton size="xl" class="w-full max-w-md shadow-lg" color="primary" @click="searchRoute">
                Buscar Ruta
             </UButton>
        </div>

    </div>
    


    <!-- Map Picker Overlay - Teleported to Body to ensure it's above everything -->
    <Teleport to="body">
        <div v-if="isPickingLocation" class="fixed inset-0 z-[60] flex flex-col pointer-events-none">
            <!-- Top Bar -->
            <div class="pointer-events-auto bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow p-4 pt-10 flex justify-between items-center">
                <h2 class="text-lg font-bold text-gray-900 dark:text-white">
                    Seleccionando {{ pickingField === 'origin' ? 'Origen' : 'Destino' }}
                </h2>
                <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="cancelMapSelection" />
            </div>
            
            <!-- Center Pin -->
            <div class="flex-1 relative">
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <!-- Pin Icon -->
                    <div class="relative -mt-8">
                        <UIcon name="i-lucide-map-pin" class="w-10 h-10 text-primary-500 drop-shadow-md" />
                        <div class="w-2 h-2 bg-black/20 rounded-full absolute -bottom-1 left-1/2 -translate-x-1/2 blur-[2px]"></div>
                    </div>
                </div>
            </div>
            
            <!-- Bottom Confirmation -->
            <div class="pointer-events-auto p-6 pb-10 flex justify-center bg-gradient-to-t from-black/50 to-transparent">
                <UButton size="xl" color="primary" @click="confirmMapSelection" class="shadow-xl">
                    Confirmar Ubicación
                </UButton>
            </div>
        </div>
    </Teleport>
  </div>
</template>
