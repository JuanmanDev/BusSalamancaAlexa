<script setup lang="ts">
import type { BusArrival } from '~/types/bus'

const props = defineProps<{
  arrivals: BusArrival[]
  loading?: boolean
}>()

const router = useRouter()

function getTimeColor(minutes: number): string {
  if (minutes <= 2) return 'text-red-500 dark:text-red-400'
  if (minutes <= 5) return 'text-orange-500 dark:text-orange-400'
  return 'text-primary-600 dark:text-primary-400'
}



function formatArrivalTime(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function goToLine(lineId: string) {
  router.push(`/line/${lineId}`)
}
</script>

<template>
  <div class="space-y-2">
    <!-- Loading skeleton -->
    <template v-if="loading">
      <div 
        v-for="i in 3" 
        :key="i"
        class="bg-white/80 dark:bg-gray-800/80 rounded-lg p-4 animate-pulse-subtle"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div class="space-y-2">
              <div class="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              <div class="w-24 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
          <div class="w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    </template>

    <!-- Arrivals list -->
    <TransitionGroup
      v-else
      name="list"
      tag="div"
      class="space-y-2"
    >
      <div
        v-for="arrival in arrivals"
        :key="`${arrival.lineId}-${arrival.expectedArrivalTime.getTime()}`"
        class="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 hover:bg-white dark:hover:bg-gray-800 transition-all"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <!-- Line badge - only number, clickable -->
            <button
              class="shrink-0 flex flex-col items-center gap-0.5 hover:scale-105 transition-transform"
              @click.stop="goToLine(arrival.lineId)"
            >
              <div 
                class="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm"
                :class="getLineColor(arrival.lineId)"
              >
                <span class="text-sm font-bold">{{ arrival.lineId }}</span>
              </div>
            </button>

            <!-- Destination - truncated on one line -->
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900 dark:text-white truncate text-sm">
                {{ arrival.destination || 'Destino desconocido' }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                Línea {{ arrival.lineId }} · {{ formatArrivalTime(arrival.expectedArrivalTime) }}
              </p>
            </div>
          </div>

          <!-- Time remaining -->
          <div class="text-right shrink-0">
            <p 
              class="text-xl font-bold tabular-nums"
              :class="getTimeColor(arrival.minutesRemaining)"
            >
              {{ arrival.minutesRemaining }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase">min</p>
          </div>
        </div>
      </div>
    </TransitionGroup>

    <!-- Empty state -->
    <div 
      v-if="!loading && arrivals.length === 0"
      class="text-center py-8 text-gray-500 dark:text-gray-400"
    >
      <UIcon name="i-lucide-bus" class="w-10 h-10 mx-auto mb-3 opacity-50" />
      <p>No hay llegadas previstas</p>
    </div>
  </div>
</template>

<style scoped>
/* Smooth list transitions with height collapse */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  margin-top: 0;
  margin-bottom: 0;
}

.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  margin-top: 0;
  margin-bottom: 0;
}

/* Ensure leaving items don't affect layout */
.list-leave-active {
  position: absolute;
  width: 100%;
  overflow: hidden;
}

/* Initial state for entering items */
.list-enter-active {
  overflow: hidden;
  max-height: 100px;
}
</style>
