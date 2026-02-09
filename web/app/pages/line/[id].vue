<script setup lang="ts">
import type { BusStop, BusLine } from '~/types/bus'

const route = useRoute()
const router = useRouter()
const storage = useStorage()
const mapStore = useMapStore()

const lineId = computed(() => route.params.id as string)

// Load data
const { data: allLines, status: linesStatus } = await useBusLines()

const { data: allStops, status: stopsStatus } = await useBusStops()

const lineInfo = computed(() => 
  allLines.value?.find(l => l.id === lineId.value)
)

// Stops on this line - filter by stops that include this lineId
const lineStops = computed((): BusStop[] => {
  if (!allStops.value) return []
  
  const filtered = allStops.value.filter(s => {
    if (!s.lines || !Array.isArray(s.lines)) return false
    return s.lines.includes(lineId.value)
  })
  
  // Sort numerically by stop id
  return filtered.sort((a, b) => parseInt(a.id) - parseInt(b.id))
})

// Parse route name
function getRouteParts(name: string): { origin: string; destination: string } | null {
  const parts = name.split(' - ')
  if (parts.length >= 2 && parts[0]) {
    return {
      origin: parts[0].trim(),
      destination: parts.slice(1).join(' - ').trim()
    }
  }
  return null
}

const routeParts = computed(() => lineInfo.value ? getRouteParts(lineInfo.value.name) : null)

// Set page meta
useSeoMeta({
  title: () => lineInfo.value ? `Línea ${lineId.value} - Bus Salamanca` : `Línea ${lineId.value}`,
  description: () => `Información de la línea ${lineId.value} de autobús de Salamanca`,
})

// Favorite toggle
const isFavorite = computed(() => storage.isFavorite('line', lineId.value))

function toggleFavorite() {
  if (lineInfo.value) {
    storage.toggleFavorite('line', lineId.value, lineInfo.value.name)
  }
}

function goToStop(stop: BusStop) {
  storage.addRecent('stop', stop.id, stop.name)
  router.push(`/stop/${stop.id}`)
}

// Vehicles for this line (from store)
const lineVehicles = computed(() => 
  mapStore.vehicles.filter(v => v.lineId === lineId.value)
)

const isRefreshing = computed(() => mapStore.arrivalsLoading)

// Set map context on mount
onMounted(async () => {
  if (lineInfo.value) {
    storage.addRecent('line', lineId.value, lineInfo.value.name)
  }
  await mapStore.setContextToLinePage(lineId.value)
})

// Handle line ID changes (navigation between lines)
watch(lineId, async (newId) => {
  const line = allLines.value?.find(l => l.id === newId)
  if (line) {
    storage.addRecent('line', newId, line.name)
  } else {
    console.error(`Línea ${newId} no encontrada`)
  }
  await mapStore.setContextToLinePage(newId)
  updateMapLines()
})

// Update Map Lines (Connect stops 1->2->3...)
function updateMapLines() {
    if (!lineStops.value || lineStops.value.length < 2) {
        // Only clear if we really have no stops (and thus no line)
        if (lineStops.value && lineStops.value.length === 0) {
             mapStore.setLines([])
        }
        return
    }

    const linesToSet: { id: string, color: string, points: { lat: number, lng: number }[] }[] = []
    const hex = getLineColorHex(lineId.value)

    // Strategy 1: Use explicit directions from API (Best)
    if (lineInfo.value?.directions && lineInfo.value.directions.length > 0) {
        lineInfo.value.directions.forEach((dir, idx) => {
            const points: { lat: number; lng: number }[] = []
            
            dir.stops.forEach(stopRef => {
                const stop = allStops.value?.find(s => s.id === stopRef.id)
                if (stop && stop.latitude && stop.longitude) {
                    points.push({ lat: stop.latitude, lng: stop.longitude })
                }
            })
            
            if (points.length > 1) {
                linesToSet.push({
                    id: `${lineId.value}-${dir.id || idx}`,
                    color: hex,
                    points: points
                })
            }
        })
    }

    // Strategy 2: Fallback to numeric sort (Legacy/Backup)
    if (linesToSet.length === 0) {
        const points: { lat: number; lng: number }[] = []
        const validStops = lineStops.value.filter(s => s.latitude && s.longitude)
        
        validStops.forEach(s => {
            points.push({ lat: s.latitude!, lng: s.longitude! })
        })
        
        if (points.length > 1) {
            linesToSet.push({
                id: lineId.value,
                color: hex,
                points: points
            })
        }
    }
    
    mapStore.setLines(linesToSet)
    console.log('Map lines updated', linesToSet.length, 'segments')
}

// Watch stops and lineId to update lines
// Removed immediate: true to avoid race with setContextToLinePage clearing lines
watch([lineStops, lineId, lineInfo], () => {
    updateMapLines()
})

onMounted(async () => {
  if (lineInfo.value) {
    storage.addRecent('line', lineId.value, lineInfo.value.name)
  }
  // This clears context (and lines)
  await mapStore.setContextToLinePage(lineId.value)
  
  // Ensure we fetch stops if not present (for the computed)
  if (!allStops.value || allStops.value.length === 0) {
      const busService = useBusService()
      allStops.value = await busService.fetchStops()
  }
  
  // Now set the lines
  updateMapLines()
})

const isLoading = computed(() => 
  linesStatus.value === 'pending' || stopsStatus.value === 'pending'
)
</script>

<template>
  <div class="max-w-3xl mx-auto flex flex-col md:block">
    <!-- Map Preview (Order 1 on Mobile, 2 on Desktop handled via classes mainly but here we want content first on desktop, map first on mobile) -->
    <!-- Mobile: Map (Top) -> Content
      Desktop: Content -> Map (Bottom)
    -->
    <MapPreview />

    <!-- Content -->
    <div class="px-4 py-6 space-y-4">

    <!-- Loading -->
    <div v-if="isLoading" class="glass-card p-6">
      <LoadingSpinner size="lg" text="Cargando línea..." />
    </div>

    <template v-else>
      <!-- Header card -->
      <div class="glass-card p-5">
        <!-- Breadcrumb -->
        <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
          <NuxtLink to="/lines" class="hover:text-primary-500 transition-colors">Líneas</NuxtLink>
          <UIcon name="i-lucide-chevron-right" class="w-4 h-4" />
          <span>Línea {{ lineId }}</span>
        </div>

        <!-- Line info -->
        <div class="flex items-start gap-4">
          <div 
            class="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
            :class="getLineColor(lineId)"
            :style="{ viewTransitionName: `line-${lineId}` }"
          >
            <span 
              class="text-3xl font-bold"
              :style="{ viewTransitionName: `line-number-${lineId}` }"
            >
              {{ lineId }}
            </span>
          </div>

          <div class="flex-1 min-w-0">
            <template v-if="routeParts">
              <p 
                class="text-xl font-bold text-gray-900 dark:text-white"
                :style="{ viewTransitionName: `line-name-${lineId}` }"
              >
                {{ routeParts.origin }}
              </p>
              <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <UIcon name="i-lucide-arrow-right" class="w-4 h-4 shrink-0" />
                <p class="truncate">{{ routeParts.destination }}</p>
              </div>
            </template>
            <p 
              v-else
              class="text-xl font-bold text-gray-900 dark:text-white"
            >
              {{ lineInfo?.name || `Línea ${lineId}` }}
            </p>

            <!-- Stats -->
            <div class="flex items-center gap-4 mt-3 text-sm">
              <div class="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <UIcon name="i-lucide-map-pin" class="w-4 h-4" />
                <span>{{ lineStops.length }} paradas</span>
              </div>
              <div class="flex items-center gap-1.5">
                <UIcon 
                  name="i-lucide-bus" 
                  class="w-4 h-4"
                  :class="lineVehicles.length > 0 ? 'text-green-500' : 'text-gray-400'"
                />
                <span :class="lineVehicles.length > 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-500'">
                  {{ lineVehicles.length }} {{ lineVehicles.length === 1 ? 'bus activo' : 'buses activos' }}
                </span>
                <UIcon 
                  v-if="isRefreshing"
                  name="i-lucide-refresh-cw" 
                  class="w-3.5 h-3.5 text-gray-400 animate-spin"
                />
              </div>
            </div>
          </div>

          <button
            class="p-3 rounded-xl transition-all bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 shrink-0"
            :class="isFavorite ? 'text-amber-500' : 'text-gray-400'"
            @click="toggleFavorite"
          >
            <UIcon 
              name="i-lucide-star"
              :class="isFavorite ? 'fill-current' : ''"
              class="w-5 h-5"
            />
          </button>
        </div>
      </div>

      <!-- Stops list -->
      <div class="glass-card p-5">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-list" class="w-5 h-5 text-primary-500" />
          Paradas de la línea ({{ lineStops.length }})
        </h2>

        <div v-if="lineStops.length === 0" class="text-center py-8 text-gray-500">
          <UIcon name="i-lucide-map-pin-off" class="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No se encontraron paradas para esta línea</p>
        </div>

        <div v-else class="space-y-2 max-h-96 overflow-y-auto">
          <button
            v-for="(stop, index) in lineStops"
            :key="stop.id"
            class="w-full flex items-center gap-3 p-3 bg-white/80 dark:bg-gray-800/80 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-all text-left"
            @click="goToStop(stop)"
          >
            <!-- Stop number in route -->
            <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center shrink-0">
              <span class="text-sm font-bold text-primary-600 dark:text-primary-400">
                {{ index + 1 }}
              </span>
            </div>

            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900 dark:text-white truncate">
                {{ stop.name }}
              </p>
              <p class="text-xs text-gray-500">Parada {{ stop.id }}</p>
            </div>

            <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-gray-400 shrink-0" />
          </button>
        </div>
      </div>

      </template>
    </div>
  </div>
</template>
