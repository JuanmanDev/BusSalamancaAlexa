<script setup lang="ts">
import type { RouteOption } from '~/composables/useRouting'
import type { BusStop } from '~/types/bus'

const route = useRoute()
const router = useRouter()
const { findRoutes } = useRouting()
const { fetchStops } = useBusService()
const { userLocation } = useGeolocation()
const mapStore = useMapStore()

const isLoading = ref(true)
const error = ref<string | null>(null)
const routes = ref<RouteOption[]>([])
const selectedRouteId = ref<string | null>(null)

// Computed for the currently selected route
const selectedRoute = computed(() => routes.value.find(r => r.id === selectedRouteId.value))

onMounted(async () => {
    // Set map context on mount
    await mapStore.setContextToRoutePage()
    await calculateRoutes()
})

async function calculateRoutes() {
    isLoading.value = true
    error.value = null
    
    try {
        const originQuery = route.query.origin as string
        const destQuery = route.query.destination as string
        
        let origin: { lat: number; lng: number; name?: string } | null = null
        let destination: { lat: number; lng: number; name?: string } | null = null
        
        const allStops = await fetchStops()
        
        // Helper to parse location string
        const parseLoc = (query: string, name?: string) => {
            if (query && query.startsWith('loc:')) {
                const [lat, lng] = query.substring(4).split(',').map(Number)
                if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                    return { lat, lng, name: name || 'Ubicación seleccionada' }
                }
            }
            return null
        }

        // 1. Resolve Origin
        if (originQuery === 'user') {
            if (userLocation.value) {
                origin = { lat: userLocation.value.lat, lng: userLocation.value.lng, name: 'Tu ubicación' }
            } else {
                 // Try to get location?
                 error.value = 'No se pudo obtener tu ubicación'
                 return
            }
        } else {
             const loc = parseLoc(originQuery, route.query.originName as string)
             if (loc) {
                 origin = loc
             } else {
                 const stop = findStop(originQuery, allStops)
                 if (stop && stop.latitude && stop.longitude) {
                     origin = { lat: stop.latitude, lng: stop.longitude, name: stop.name }
                 }
             }
        }
        
        // 2. Resolve Destination
        const destLoc = parseLoc(destQuery, route.query.destinationName as string)
        if (destLoc) {
            destination = destLoc
        } else {
            const stop = findStop(destQuery, allStops)
            if (stop && stop.latitude && stop.longitude) {
                 destination = { lat: stop.latitude, lng: stop.longitude, name: stop.name }
            } else {
                // TODO: Geocoding or "Select on Map" fallback
                error.value = `No encontramos la parada "${destQuery}". Prueba con un nombre de parada exacto.`
                // return // For now fail if not found
            }
        }
        
        // Mocking destination if not found for testing? 
        // No, let's just use the first stop if destQuery is "test"
        if (!destination && destQuery === 'test' && allStops.length > 0) {
            const s = allStops[10]!
            destination = { lat: s.latitude!, lng: s.longitude!, name: s.name }
        }
        
        if (origin && destination) {
            routes.value = await findRoutes(origin, destination)
            if (routes.value.length > 0) {
                selectRoute(routes.value[0]!.id)
            } else {
                error.value = 'No se encontraron rutas disponibles'
            }
        } else if (!destination && !error.value) {
             error.value = 'Destino no válido'
        }
        
    } catch (e) {
        console.error(e)
        error.value = 'Error calculando la ruta'
    } finally {
        isLoading.value = false
    }
}

function findStop(query: string, stops: BusStop[]) {
    if (!query) return undefined
    const q = query.toLowerCase()
    return stops.find(s => s.name.toLowerCase().includes(q) || s.id === q)
}

function selectRoute(id: string) {
    selectedRouteId.value = id
    
    // Visualize on map
    const r = routes.value.find(route => route.id === id)
    if (!r) return
    
    // Delegate to store to handle visualization and positioning
    mapStore.selectRoute(r)
}

function getSegmentIcon(type: string) {
    if (type === 'walk') return 'i-lucide-footprints'
    if (type === 'bus') return 'i-lucide-bus'
    return 'i-lucide-clock'
}

function getSegmentColor(type: string, lineId?: string) {
    if (type === 'walk') return 'text-gray-500 bg-gray-100 dark:bg-gray-800'
    if (type === 'bus' && lineId) return 'text-white ' + getLineColor(lineId)
    return 'text-gray-500'
}

</script>

<template>
  <div class="md:flex md:min-h-full">
    <!-- MapPreview: inline on mobile, left sticky on desktop -->
    <div class="md:flex-1 md:sticky md:top-16 md:h-[calc(100vh-4rem)] shrink-0 md:order-first z-0">
      <MapPreview height="h-[50vh] md:h-full" />
    </div>

    <!-- Content (right side on desktop) -->
    <div class="w-full md:w-[400px] lg:w-[450px] shrink-0 px-4 py-6 flex flex-col pointer-events-auto relative z-10">
      <UCard class="shadow-xl ring-1 ring-gray-200 dark:ring-gray-700 backdrop-blur-md bg-white/90 dark:bg-gray-900/90 w-full max-w-md mx-auto flex flex-col mt-0 h-fit max-h-[calc(100vh-6rem)]">
                <template #header>
                    <div class="flex items-center gap-3">
                        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" @click="router.back()" />
                        <h2 class="font-bold text-lg">Opciones de ruta</h2>
                    </div>
                </template>
                
                <div v-if="isLoading" class="py-4 text-center">
                    <RouteCalculationLoader 
                        :origin="route.query.origin as string"
                        :destination="route.query.destination as string"
                        :originName="route.query.originName as string"
                        :destinationName="route.query.destinationName as string"
                    />
                </div>
                
                <div v-else-if="error" class="py-6 text-center text-red-500">
                    <UIcon name="i-lucide-alert-circle" class="w-8 h-8 mx-auto mb-2" />
                    <p>{{ error }}</p>
                    <UButton label="Intentar de nuevo" variant="ghost" class="mt-2" @click="calculateRoutes" />
                </div>
                
                <div v-else class="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    <div 
                        v-for="option in routes" 
                        :key="option.id"
                        class="p-3 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                        :class="selectedRouteId === option.id ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/10' : ''"
                        @click="selectRoute(option.id)"
                    >
                        <!-- Header: Duration + Arrival -->
                        <div class="flex justify-between items-baseline mb-2">
                             <div class="flex items-center gap-2">
                                <span class="text-xl font-bold dark:text-white">{{ Math.ceil(option.totalDuration) }} min</span>
                                <span class="text-xs text-gray-400">({{ option.arrivalTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }})</span>
                             </div>
                             <div class="flex items-center gap-2 text-sm text-gray-500">
                                <span>{{ Math.ceil(option.walkingDistance) }}m</span>
                                <UIcon name="i-lucide-footprints" class="w-3 h-3" />
                             </div>
                        </div>
                        
                        <!-- Visual Timeline Summary -->
                        <div class="flex items-center gap-1 mb-3">
                            <template v-for="(segment, idx) in option.segments" :key="idx">
                                <div 
                                    class="h-1.5 rounded-full flex-1"
                                    :class="segment.type === 'walk' ? 'bg-gray-300 dark:bg-gray-600' : getLineColor(segment.lineId || '1')"
                                ></div>
                                <div v-if="idx < option.segments.length - 1" class="w-1 h-1 rounded-full bg-gray-300"></div>
                            </template>
                        </div>
                        
                        <!-- Detailed Steps (Only if selected) -->
                        <div v-if="selectedRouteId === option.id" class="mt-4 space-y-3 relative">
                            <!-- Vertical line connector -->
                            <div class="absolute left-3.5 top-2 bottom-6 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                            
                            <!-- Origin -->
                             <div class="relative flex gap-3 text-sm">
                                <div class="relative z-10 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center shrink-0 border-2 border-white dark:border-gray-900 text-white">
                                    <UIcon name="i-lucide-circle" class="w-3 h-3 fill-current" />
                                </div>
                                <div class="pt-1">
                                    <p class="font-medium dark:text-white">Inicio</p>
                                </div>
                             </div>

                            <div v-for="(segment, idx) in option.segments" :key="idx" class="relative flex gap-3 text-sm pt-2">
                                <!-- Icon -->
                                <div 
                                    class="relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 border-white dark:border-gray-900"
                                    :class="getSegmentColor(segment.type, segment.lineId)"
                                >
                                    <UIcon :name="getSegmentIcon(segment.type)" class="w-4 h-4" />
                                </div>
                                
                                <div class="pb-1">
                                    <p class="font-medium dark:text-white">
                                        {{ segment.instructions }}
                                    </p>
                                    <p class="text-xs text-gray-500">
                                        {{ segment.duration }} min · {{ Math.round(segment.distance) }}m
                                        <span v-if="segment.type === 'bus'">· Desde {{ segment.from.name }} hasta {{ segment.to.name }}</span>
                                    </p>
                                </div>
                            </div>
                            
                             <!-- Destination Flag -->
                             <div class="relative flex gap-3 text-sm pt-2">
                                <div class="relative z-10 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center shrink-0 border-2 border-white dark:border-gray-900 text-white">
                                    <UIcon name="i-lucide-map-pin" class="w-4 h-4" />
                                </div>
                                <div class="pt-1">
                                    <p class="font-medium dark:text-white">Llegada</p>
                                </div>
                             </div>
                        </div>
                        
                        <!-- Brief Summary (If not selected) -->
                        <div v-else class="text-sm text-gray-500 flex items-center gap-2">
                            <span>{{ option.transfers }} trasbordos</span>
                        </div>
                    </div>
                </div>
            </UCard>
        </div>
    </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(156, 163, 175, 0.5);
    border-radius: 20px;
}
</style>
