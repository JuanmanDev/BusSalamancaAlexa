<script setup lang="ts">
import type { BusStop } from '~/types/bus'

const props = withDefaults(defineProps<{
  stops: BusStop[]
  loading?: boolean
  showDistance?: boolean
  showFavorite?: boolean
  showLines?: boolean
  sortById?: boolean
}>(), {
  sortById: false
})

const emit = defineEmits<{
  (e: 'select', stop: BusStop): void
  (e: 'toggle-favorite', stop: BusStop): void
}>()

const storage = useStorage()
const geolocation = useGeolocation()

// Sort stops numerically by ID if sortById prop is true
const sortedStops = computed(() => {
  if (!props.sortById) return props.stops
  
  return [...props.stops].sort((a, b) => {
    const numA = parseInt(a.id) || 0
    const numB = parseInt(b.id) || 0
    return numA - numB
  })
})

function isFavorite(stopId: string): boolean {
  return storage.isFavorite('stop', stopId)
}

function getDistance(stop: BusStop): string | null {
  if (!props.showDistance) return null
  const distance = geolocation.getDistanceToStop(stop)
  if (distance === null) return null
  return geolocation.formatDistance(distance)
}


</script>

<template>
  <div class="space-y-2">
    <!-- Loading skeleton -->
    <template v-if="loading">
      <div 
        v-for="i in 5" 
        :key="i"
        class="bg-white/80 dark:bg-gray-800/80 rounded-lg p-4 animate-pulse-subtle"
      >
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div class="flex-1 space-y-2">
            <div class="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div class="w-1/2 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    </template>

    <!-- Stops list -->
    <div 
      v-else
      v-for="stop in sortedStops"
      :key="stop.id"
      class="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition-all"
      :style="{ viewTransitionName: `stop-${stop.id}` }"
      @click="emit('select', stop)"
    >
      <div class="flex items-center gap-3">
        <!-- Stop ID badge -->
        <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900/50 rounded-lg flex items-center justify-center shrink-0">
          <span class="font-bold text-primary-600 dark:text-primary-400 text-sm">
            {{ stop.id }}
          </span>
        </div>

        <!-- Stop info -->
        <div class="flex-1 min-w-0">
          <p 
            class="font-medium text-gray-900 dark:text-white truncate text-sm"
            :style="{ viewTransitionName: `stop-name-${stop.id}` }"
          >
            {{ stop.name }}
          </p>
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <span v-if="getDistance(stop)" class="flex items-center gap-1">
              <UIcon name="i-lucide-navigation" class="w-3 h-3" />
              {{ getDistance(stop) }}
            </span>
            <!-- Lines -->
            <div v-if="showLines && stop.lines?.length" class="flex items-center gap-1">
              <template v-for="(line, idx) in stop.lines.slice(0, 10)" :key="line">
                <span 
                  class="px-1.5 py-0.5 rounded text-white text-[10px] font-medium"
                  :class="getLineColor(line)"
                >
                  {{ line }}
                </span>
              </template>
              <span v-if="stop.lines.length > 10" class="text-gray-400">
                +{{ stop.lines.length - 10 }}
              </span>
            </div>
          </div>
        </div>

        <!-- Favorite button -->
        <button
          v-if="showFavorite"
          class="p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700"
          :class="isFavorite(stop.id) ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'"
          @click.stop="emit('toggle-favorite', stop)"
        >
          <UIcon 
            name="i-lucide-star" 
            class="w-4 h-4"
            :class="isFavorite(stop.id) ? 'fill-current' : ''"
          />
        </button>

        <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-gray-400 shrink-0" />
      </div>
    </div>

    <!-- Empty state -->
    <div 
      v-if="!loading && stops.length === 0"
      class="text-center py-6 text-gray-500 dark:text-gray-400"
    >
      <UIcon name="i-lucide-map-pin-off" class="w-10 h-10 mx-auto mb-3 opacity-50" />
      <p>No hay paradas disponibles</p>
    </div>
  </div>
</template>
