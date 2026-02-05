<script setup lang="ts">
import type { BusLine } from '~/types/bus'

const props = defineProps<{
  lines: BusLine[]
  loading?: boolean
  showFavorite?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', line: BusLine): void
  (e: 'toggle-favorite', line: BusLine): void
}>()

const storage = useStorage()

// Sort lines numerically
const sortedLines = computed(() => {
  return [...props.lines].sort((a, b) => {
    const numA = parseInt(a.id) || 0
    const numB = parseInt(b.id) || 0
    return numA - numB
  })
})

function isFavorite(lineId: string): boolean {
  return storage.isFavorite('line', lineId)
}



// Parse route name into origin/destination
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

    <!-- Lines list -->
    <div
      v-else
      v-for="line in sortedLines"
      :key="line.id"
      class="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition-all"
      :style="{ viewTransitionName: `line-${line.id}` }"
      @click="emit('select', line)"
    >
      <div class="flex items-center gap-3">
        <!-- Line number badge - larger -->
        <div 
          class="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
          :class="getLineColor(line.id)"
        >
          <span 
            class="text-xl font-bold"
            :style="{ viewTransitionName: `line-number-${line.id}` }"
          >
            {{ line.id }}
          </span>
        </div>

        <!-- Line info -->
        <div class="flex-1 min-w-0">
          <template v-if="getRouteParts(line.name)">
            <p 
              class="font-medium text-gray-900 dark:text-white truncate text-sm"
              :style="{ viewTransitionName: `line-name-${line.id}` }"
            >
              {{ getRouteParts(line.name)!.origin }}
            </p>
            <p class="text-xs text-gray-500 truncate flex items-center gap-1">
              <UIcon name="i-lucide-arrow-right" class="w-3 h-3 shrink-0" />
              {{ getRouteParts(line.name)!.destination }}
            </p>
          </template>
          <p 
            v-else
            class="font-medium text-gray-900 dark:text-white truncate text-sm"
          >
            {{ line.name }}
          </p>
        </div>

        <!-- Favorite button -->
        <button
          v-if="showFavorite"
          class="p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700"
          :class="isFavorite(line.id) ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'"
          @click.stop="emit('toggle-favorite', line)"
        >
          <UIcon 
            name="i-lucide-star" 
            class="w-4 h-4"
            :class="isFavorite(line.id) ? 'fill-current' : ''"
          />
        </button>

        <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-gray-400 shrink-0" />
      </div>
    </div>

    <!-- Empty state -->
    <div 
      v-if="!loading && lines.length === 0"
      class="text-center py-6 text-gray-500 dark:text-gray-400"
    >
      <UIcon name="i-lucide-route" class="w-10 h-10 mx-auto mb-3 opacity-50" />
      <p>No hay líneas disponibles</p>
    </div>
  </div>
</template>
