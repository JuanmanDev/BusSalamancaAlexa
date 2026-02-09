<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import type { BusStop } from '~/types/bus'

const router = useRouter()
const { fetchStops } = useBusService()
const { userLocation } = useGeolocation()
const mapStore = useMapStore()

// State
const originQuery = ref('')
const destQuery = ref('')
const originSelected = ref<{ id: string; name: string; type: 'user' | 'stop' | 'address' | 'map'; lat?: number; lng?: number } | null>(null)
const destSelected = ref<{ id: string; name: string; type: 'user' | 'stop' | 'address' | 'map'; lat?: number; lng?: number } | null>(null)

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
    allStops.value = await fetchStops()
    // Default origin to user location if available
    if (userLocation.value) {
        originSelected.value = {
            id: 'user',
            name: 'Mi ubicación',
            type: 'user',
            lat: userLocation.value.lat,
            lng: userLocation.value.lng
        }
        originQuery.value = 'Mi ubicación'
    } else {
         originSelected.value = {
            id: 'user',
            name: 'Mi ubicación',
            type: 'user',
            lat: 0,
            lng: 0
        }
        originQuery.value = 'Mi ubicación'
    }
})

const isPickingLocation = ref(false)
const pickingField = ref<'origin' | 'destination' | null>(null)

function startMapSelection(field: 'origin' | 'destination') {
    activeField.value = null
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
        originSelected.value = location
        originQuery.value = location.name
    } else {
        destSelected.value = location
        destQuery.value = location.name
    }

    cancelMapSelection()
}

function cancelMapSelection() {
    isPickingLocation.value = false
    pickingField.value = null
    mapStore.setFullscreen(false)
}

// Search Logic
const performSearch = useDebounceFn(async (query: string) => {
    isSearching.value = true
    const results: SearchResult[] = []
    
    // 0. Add "Select on Map" option always
    // (Or maybe only when not typing? No, always good)
    
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

    // ... existing logic ...
    
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
    
    // Add map option at the end too
    results.push({
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
    if (activeField.value === 'origin' && val !== originSelected.value?.name) {
         performSearch(val)
    }
})

watch(destQuery, (val) => {
    if (activeField.value === 'destination' && val !== destSelected.value?.name) {
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

    if (activeField.value === 'origin') {
        originSelected.value = {
            id: result.id,
            name: result.name,
            type: result.type as any,
            lat: result.lat,
            lng: result.lng
        }
        originQuery.value = result.name
    } else {
        destSelected.value = {
            id: result.id,
            name: result.name,
            type: result.type as any,
            lat: result.lat,
            lng: result.lng
        }
        destQuery.value = result.name
    }
    activeField.value = null
    suggestions.value = []
}

function searchRoute() {
    if (!originSelected.value || !destSelected.value) return

    const query: any = {}
    
    // Origin
    if (originSelected.value.type === 'stop') {
        query.origin = originSelected.value.id // pass ID for stops
    } else if (originSelected.value.type === 'user') {
        query.origin = 'user'
    } else {
        query.origin = `loc:${originSelected.value.lat},${originSelected.value.lng}`
        query.originName = originSelected.value.name
    }
    
    // Destination
    if (destSelected.value.type === 'stop') {
        query.destination = destSelected.value.id
    } else {
        query.destination = `loc:${destSelected.value.lat},${destSelected.value.lng}`
        query.destinationName = destSelected.value.name
    }

    router.push({
        path: '/route/results',
        query
    })
}

function swappoints() {
    const tempSel = originSelected.value
    const tempQ = originQuery.value
    
    originSelected.value = destSelected.value
    originQuery.value = destQuery.value
    
    destSelected.value = tempSel
    destQuery.value = tempQ
}

</script>

<template>
    <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-950 min-h-screen pointer-events-auto">
        <!-- Header -->
        <div class="bg-white dark:bg-gray-900 shadow-sm p-4 pt-4">
             <div class="max-w-md mx-auto relative">
                <div class="flex items-center gap-2 mb-4">
                    <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" @click="router.back()" />
                    <h1 class="text-lg font-bold">Planificar Ruta</h1>
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
                                <UButton v-if="originQuery && activeField === 'origin'" icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="originQuery = ''; originSelected = null" />
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
                                <UButton v-if="destQuery && activeField === 'destination'" icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="destQuery = ''; destSelected = null" />
                            </template>
                         </UInput>
                     </div>

                     <!-- Swap Button -->
                     <div class="flex items-center">
                         <UButton icon="i-lucide-arrow-up-down" color="neutral" variant="ghost" @click="swappoints" />
                     </div>
                </div>
             </div>
        </div>

        <!-- Suggestions List -->
        <div class="flex-1 overflow-y-auto max-w-md mx-auto w-full p-2">
            
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
                    class="w-full text-left p-3 rounded-lg hover:bg-white dark:hover:bg-gray-900 flex items-center gap-3 transition-colors active:bg-gray-100 dark:active:bg-gray-800"
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
            
            <!-- Initial State / Recent (TODO) -->
            <div v-else-if="!activeField" class="text-center py-10 opacity-60">
                <div v-if="originSelected && destSelected">
                     <UButton size="xl" block color="primary" @click="searchRoute">
                        Buscar Ruta
                     </UButton>
                </div>
            </div>
            
            <!-- No results -->
            <div v-else-if="activeField && !isSearching && suggestions.length === 0 && (activeField === 'origin' ? originQuery : destQuery).length > 2" class="py-10 text-center text-gray-500">
                <p>No se encontraron resultados</p>
            </div>
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
</template>
```
