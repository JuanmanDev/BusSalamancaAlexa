<script setup lang="ts">
import type { BusStop } from '~/types/bus'

const route = useRoute()
const storage = useStorage()
const mapStore = useMapStore()

const stopId = computed(() => route.params.id as string)

// Load stop info from cached data
const { data: allStops } = await useBusStops()

const stopInfo = computed(() => {
  const stops = allStops.value as BusStop[] | null
  return stops?.find(s => s.id === stopId.value)
})

// Set page meta
useSeoMeta({
  title: () => stopInfo.value ? `Parada ${stopInfo.value.name} - Bus Salamanca` : 'Parada - Bus Salamanca',
  description: () => `Tiempos de llegada en tiempo real para la parada ${stopInfo.value?.name || stopId.value}`,
})

// Arrivals from store (managed by context)
const arrivals = computed(() => mapStore.arrivals)
const loading = computed(() => mapStore.arrivalsLoading)
const isRefreshing = computed(() => mapStore.arrivalsLoading && mapStore.arrivals.length > 0)
const error = computed(() => mapStore.arrivalsError)
const lastUpdated = computed(() => mapStore.lastUpdated)

// Set map context on mount
onMounted(async () => {
  if (stopInfo.value) {
    storage.addRecent('stop', stopId.value, stopInfo.value.name)
  }
  await mapStore.setContextToStopPage(stopId.value)
})

// Handle stop ID changes (navigation between stops)
watch(stopId, async (newId) => {
  const stops = allStops.value as BusStop[] | null
  const stop = stops?.find(s => s.id === newId)
  if (stop) {
    storage.addRecent('stop', newId, stop.name)
  }
  await mapStore.setContextToStopPage(newId)
})

// Favorite toggle
const isFavorite = computed(() => storage.isFavorite('stop', stopId.value))

function toggleFavorite() {
  if (stopInfo.value) {
    storage.toggleFavorite('stop', stopId.value, stopInfo.value.name)
  }
}

function formatLastUpdated(): string {
  if (!lastUpdated.value) return ''
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(lastUpdated.value)
}

// Manual refresh
async function refreshArrivals() {
  await mapStore.setContextToStopPage(stopId.value)
}

// Open in external maps
function openInGoogleMaps() {
  if (stopInfo.value?.latitude && stopInfo.value?.longitude) {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${stopInfo.value.latitude},${stopInfo.value.longitude}`,
      '_blank'
    )
  }
}

function openInAppleMaps() {
  if (stopInfo.value?.latitude && stopInfo.value?.longitude) {
    window.open(
      `https://maps.apple.com/?daddr=${stopInfo.value.latitude},${stopInfo.value.longitude}`,
      '_blank'
    )
  }
}
</script>

<template>
  <div class="md:flex md:min-h-full">
    <!-- MapPreview: inline on mobile, left sticky on desktop -->
    <div class="md:flex-1 md:sticky md:top-16 md:h-[calc(100vh-4rem)] shrink-0 md:order-first z-0">
      <MapPreview height="h-[50vh] md:h-full" />
    </div>

    <!-- Content (right side on desktop) -->
    <div class="w-full md:w-[400px] lg:w-[450px] shrink-0 flex flex-col md:justify-end space-y-4 px-4 py-4 pointer-events-auto relative z-10">

      <!-- Header card -->
      <div class="glass-card p-5">
        <div class="grid grid-cols-[1fr_auto] grid-rows-[auto_auto] gap-x-4">
          <!-- Breadcrumb: top-left -->
          <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <NuxtLink to="/stops" class="hover:text-primary-500 transition-colors">
              Paradas
            </NuxtLink>
            <UIcon name="i-lucide-chevron-right" class="w-4 h-4" />
            <span :style="{ viewTransitionName: `stop-${stopId}` }">{{ stopId }}</span>
          </div>

          <!-- Favorite star: right column, spanning both rows -->
          <button
            class="row-span-2 self-center p-3 rounded-xl transition-all bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800"
            :class="isFavorite ? 'text-amber-500' : 'text-gray-400'"
            @click="toggleFavorite"
          >
            <UIcon 
              name="i-lucide-star"
              :class="isFavorite ? 'fill-current' : ''"
              class="w-6 h-6"
            />
          </button>

          <!-- Stop name: bottom-left -->
          <h1 
            class="text-xl font-bold text-gray-900 dark:text-white mt-1"
            :style="{ viewTransitionName: `stop-name-${stopId}` }"
          >
            {{ stopInfo?.name || `Parada ${stopId}` }}
          </h1>
        </div>
      </div>

      <!-- Error -->
      <div 
        v-if="error"
        class="glass-card p-4 border-l-4 border-red-500"
      >
        <div class="flex items-center gap-3 text-red-600 dark:text-red-400">
          <UIcon name="i-lucide-alert-circle" class="w-5 h-5 shrink-0" />
          <span class="flex-1">{{ error }}</span>
          <UButton size="sm" variant="ghost" @click="refreshArrivals">
            Reintentar
          </UButton>
        </div>
      </div>

      <!-- Arrivals -->
      <div class="glass-card p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            Próximas llegadas
          </h2>

          <div class="flex items-center gap-2">
            <UButton
              variant="ghost"
              size="sm"
              icon="i-lucide-refresh-cw"
              :loading="loading || isRefreshing"
              @click="refreshArrivals"
            >
              Actualizar
            </UButton>
          </div>
        </div>
        <BusArrivals
          :arrivals="arrivals"
          :loading="loading"
        />
        
        <span v-if="lastUpdated" class="flex items-center justify-center gap-1">
          <span class="text-xs text-gray-500" v-if="lastUpdated">
            Última actualización: {{ formatLastUpdated() }}
          </span>
        </span>
      </div>

      <!-- Actions -->
      <div class="grid grid-cols-2 gap-3">
        <!-- Route Actions -->
        <NuxtLink
          :to="`/route?origin=${stopId}`"
          class="glass-card p-4 hover:scale-[1.02] transition-all flex items-center gap-3"
        >
          <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900/50 rounded-lg flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-map-pin" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div class="text-left">
            <p class="font-medium text-gray-900 dark:text-white text-sm">Desde aquí</p>
            <p class="text-xs text-gray-500">Planificar ruta</p>
          </div>
        </NuxtLink>

        <NuxtLink
          :to="`/route?destination=${stopId}`"
          class="glass-card p-4 hover:scale-[1.02] transition-all flex items-center gap-3"
        >
          <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900/50 rounded-lg flex items-center justify-center shrink-0">
             <UIcon name="i-lucide-flag" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div class="text-left">
            <p class="font-medium text-gray-900 dark:text-white text-sm">Hasta aquí</p>
            <p class="text-xs text-gray-500">Planificar ruta</p>
          </div>
        </NuxtLink>

        <!-- External Maps -->
        <button
          class="glass-card p-4 hover:scale-[1.02] transition-all flex items-center gap-3"
          @click="openInGoogleMaps"
        >
          <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-navigation" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div class="text-left">
            <p class="font-medium text-gray-900 dark:text-white text-sm">Google Maps</p>
            <p class="text-xs text-gray-500">Cómo llegar</p>
          </div>
        </button>

        <button
          class="glass-card p-4 hover:scale-[1.02] transition-all flex items-center gap-3"
          @click="openInAppleMaps"
        >
          <div class="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-map" class="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div class="text-left">
            <p class="font-medium text-gray-900 dark:text-white text-sm">Apple Maps</p>
            <p class="text-xs text-gray-500">Cómo llegar</p>
          </div>
        </button>
      </div>

      
      <!-- Lines at this stop -->
      <div v-if="stopInfo?.lines?.length" class="glass-card p-5">
        <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
          Líneas de autobús disponibles
        </h2>
        <div class="flex flex-wrap gap-2">
          <NuxtLink
            v-for="lineId in stopInfo.lines"
            :key="lineId"
            :to="`/line/${lineId}`"
            class="pr-3 pl-1 py-1 rounded-lg hover:scale-[1.2] transition-all"
          >
            <div 
              class="w-8 h-8 rounded-md flex items-center justify-center text-white shadow-sm font-bold text-sm"
              :class="getLineColor(lineId)"
            >
              {{ lineId }}
            </div>
          </NuxtLink>
          
        </div>
      </div>
    </div>
  </div>
</template>
