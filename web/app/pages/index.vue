<script setup lang="ts">
import type { BusStop, BusLine } from '~/types/bus'

useSeoMeta({
  title: 'Bus Salamanca - Horarios en tiempo real',
  description: 'Consulta los tiempos de llegada de autobuses en Salamanca en tiempo real',
})

const router = useRouter()
const storage = useStorage()
const geolocation = useGeolocation()
const mapStore = useMapStore()

// Load static data
const { data: allStops, status: stopsStatus } = await useBusStops()

const { data: allLines, status: linesStatus } = await useBusLines()

const isLoading = computed(() => stopsStatus.value === 'pending' || linesStatus.value === 'pending')

// Nearby stops - sorted by distance (closest first) thanks to getNearbyStops
const nearbyStops = computed(() => {
  if (!geolocation.userLocation.value || !allStops.value) return []
  return geolocation.getNearbyStops(allStops.value, 2000).slice(0, 5)
})

// Location state derived from geolocation
const locationState = computed(() => {
  if (geolocation.isLocating.value) return 'locating'
  if (geolocation.userLocation.value) return 'found'
  if (geolocation.permissionDenied.value) return 'denied'
  return 'idle'
})

// Enhanced recents - include destination info
interface EnhancedRecent {
  type: 'stop' | 'line'
  id: string
  name: string
  visitedAt: number
  destination?: string
  lineHint?: string
}

const enhancedRecents = computed((): EnhancedRecent[] => {
  return storage.recents.value.map(recent => {
    if (recent.type === 'line' && allLines.value) {
      const line = allLines.value.find(l => l.id === recent.id)
      return { ...recent, destination: line?.name }
    }
    if (recent.type === 'stop' && allStops.value) {
      const stop = allStops.value.find(s => s.id === recent.id)
      const firstLine = stop?.lines?.[0]
      return { ...recent, destination: stop?.name, lineHint: firstLine }
    }
    return { ...recent, destination: undefined, lineHint: undefined }
  })
})

// Navigation
function goToStop(stop: BusStop) {
  storage.addRecent('stop', stop.id, stop.name)
  router.push(`/stop/${stop.id}`)
}

function goToLine(line: BusLine) {
  storage.addRecent('line', line.id, line.name)
  router.push(`/line/${line.id}`)
}

function toggleFavoriteStop(stop: BusStop) {
  storage.toggleFavorite('stop', stop.id, stop.name)
}

function toggleFavoriteLine(line: BusLine) {
  storage.toggleFavorite('line', line.id, line.name)
}

// Request location handler
async function handleRequestLocation() {
  await geolocation.requestLocation()
}

// Set map context on mount
onMounted(async () => {
  await mapStore.setContextToHomePage()
})
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-6" id="mapPreviewContainer__">
    <!-- Hero section -->
    <div class="glass-card text-center py-6 px-4">
      <h1 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
        Bus Salamanca
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        Consulta tiempos de llegada en tiempo real
      </p>
    </div>
    
    <!-- Map preview spacer - ensures minimum height for map visibility -->
    <div class="md:order-last mb-4 md:mb-0 md:mt-6">
       <MapPreview />
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="glass-card p-6">
      <LoadingSpinner size="lg" text="Cargando datos..." />
    </div>

    <!-- Favorites -->
    <div 
      v-if="storage.favoriteStops.value.length > 0 || storage.favoriteLines.value.length > 0"
      class="glass-card p-5"
    >
      <div class="flex items-center gap-2 mb-4">
        <UIcon name="i-lucide-star" class="w-5 h-5 text-amber-500" />
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Favoritos</h2>
      </div>

      <!-- Favorite stops -->
      <div v-if="storage.favoriteStops.value.length > 0" class="mb-4">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Paradas</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NuxtLink
            v-for="fav in storage.favoriteStops.value"
            :key="`stop-${fav.id}`"
            :to="`/stop/${fav.id}`"
            class="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 hover:bg-white dark:hover:bg-gray-800 transition-all"
            :style="{ viewTransitionName: `stop-${fav.id}` }"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900/50 rounded-lg flex items-center justify-center shrink-0">
                <span class="font-bold text-primary-600 dark:text-primary-400 text-sm">{{ fav.id }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 dark:text-white truncate text-sm">{{ fav.name }}</p>
              </div>
              <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-gray-400 shrink-0" />
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- Favorite lines -->
      <div v-if="storage.favoriteLines.value.length > 0">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Líneas</h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <NuxtLink
            v-for="fav in storage.favoriteLines.value"
            :key="`line-${fav.id}`"
            :to="`/line/${fav.id}`"
            class="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 hover:bg-white dark:hover:bg-gray-800 transition-all"
            :style="{ viewTransitionName: `line-${fav.id}` }"
          >
            <div class="flex items-center gap-3">
              <div 
                class="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0"
                :class="getLineColor(fav.id)"
              >
                <span class="text-lg font-bold">{{ fav.id }}</span>
              </div>
              <p class="text-xs text-gray-500 truncate flex-1">{{ fav.name }}</p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Nearby stops section with animations -->
    <div class="glass-card p-5 overflow-hidden">
      <Transition name="height-fade" mode="out-in">
        <!-- Location loading state -->
        <div 
          v-if="locationState === 'locating'"
          key="loading"
          class="text-center py-4"
        >
          <div class="flex flex-col items-center justify-center gap-3">
            <div class="relative">
              <UIcon 
                name="i-lucide-navigation" 
                class="w-10 h-10 text-primary-500 animate-bounce"
              />
              <div class="absolute inset-0 w-10 h-10 rounded-full bg-primary-500/30 animate-ping" />
            </div>
            <p class="text-gray-600 dark:text-gray-400 font-medium">
              Obteniendo ubicación...
            </p>
          </div>
        </div>

        <!-- Nearby stops list -->
        <div 
          v-else-if="locationState === 'found' && nearbyStops.length > 0"
          key="list"
        >
          <div class="flex items-center gap-2 mb-4">
            <UIcon name="i-lucide-navigation" class="w-5 h-5 text-primary-500" />
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Paradas cercanas</h2>
            <span class="text-xs text-gray-500">(más cercanas primero)</span>
          </div>
          <BusStops
            :stops="nearbyStops"
            :show-distance="true"
            :show-favorite="true"
            :show-lines="true"
            @select="goToStop"
            @toggle-favorite="toggleFavoriteStop"
          />
        </div>

        <!-- No nearby stops found -->
        <div 
          v-else-if="locationState === 'found' && nearbyStops.length === 0"
          key="empty"
          class="text-center py-4"
        >
          <UIcon name="i-lucide-map-pin-off" class="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p class="text-gray-600 dark:text-gray-400">No hay paradas en un radio de 500m</p>
        </div>

        <!-- Permission denied -->
        <div 
          v-else-if="locationState === 'denied'"
          key="denied"
          class="text-center py-4"
        >
          <UIcon name="i-lucide-x-circle" class="w-10 h-10 mx-auto text-red-500 mb-3" />
          <h3 class="font-semibold text-gray-900 dark:text-white mb-2">Acceso denegado</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Activa el permiso de ubicación en tu navegador
          </p>
        </div>

        <!-- Request location button -->
        <div 
          v-else
          key="request"
          class="text-center py-4"
        >
          <UIcon name="i-lucide-map-pin" class="w-10 h-10 mx-auto text-primary-500 mb-3" />
          <h3 class="font-semibold text-gray-900 dark:text-white mb-2">Activa tu ubicación</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Encuentra las paradas más cercanas
          </p>
          <UButton icon="i-lucide-navigation" @click="handleRequestLocation">
            Activar ubicación
          </UButton>
        </div>
      </Transition>
    </div>

    <!-- Recent -->
    <div v-if="enhancedRecents.length > 0" class="glass-card p-5">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-clock" class="w-5 h-5 text-gray-400" />
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Recientes</h2>
        </div>
        <button 
          class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          @click="storage.clearRecents"
        >
          Limpiar
        </button>
      </div>
      <div class="space-y-2">
        <NuxtLink
          v-for="recent in enhancedRecents"
          :key="`${recent.type}-${recent.id}`"
          :to="recent.type === 'stop' ? `/stop/${recent.id}` : `/line/${recent.id}`"
          class="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 rounded-lg px-4 py-3 hover:bg-white dark:hover:bg-gray-800 transition-all"
        >
          <div 
            v-if="recent.type === 'line'"
            class="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0"
            :class="getLineColor(recent.id)"
          >
            <span class="font-bold">{{ recent.id }}</span>
          </div>
          <div 
            v-else
            class="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center shrink-0"
          >
            <UIcon name="i-lucide-map-pin" class="w-5 h-5 text-gray-500" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
              {{ recent.type === 'stop' ? recent.destination : recent.name }}
            </p>
            <p class="text-xs text-gray-500 truncate">
              {{ recent.type === 'stop' ? `Parada ${recent.id}` : `Línea ${recent.id}` }}
            </p>
          </div>
          <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-gray-400 shrink-0" />
        </NuxtLink>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="grid grid-cols-2 gap-4">
      <NuxtLink
        to="/lines"
        class="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
      >
        <UIcon name="i-lucide-route" class="w-8 h-8 mb-3" />
        <h3 class="font-semibold">Todas las líneas</h3>
        <p class="text-sm text-white/80">Ver itinerarios</p>
      </NuxtLink>

      <NuxtLink
        to="/map"
        class="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
      >
        <UIcon name="i-lucide-map" class="w-8 h-8 mb-3" />
        <h3 class="font-semibold">Ver mapa</h3>
        <p class="text-sm text-white/80">Paradas y buses</p>
      </NuxtLink>
    </div>
  </div>
</template>

<style>
@reference "tailwindcss";

.height-fade-enter-active,
.height-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 1000px;
  opacity: 1;
}

.height-fade-enter-from,
.height-fade-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}
</style>
