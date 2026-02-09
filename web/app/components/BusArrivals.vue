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
  <div class="relative min-h-[100px]">
    <!-- Simple max-height transition as requested -->
    <Transition mode="out-in" name="expand">
      
      <!-- Loading skeleton container -->
      <div v-if="loading" key="loading" class="content is-expanded">
        <div class="space-y-2">
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
        </div>
      </div>

      <!-- Content container -->
      <div v-else key="content" class="content is-expanded">
        <div class="space-y-2">
          <!-- Arrivals list -->
          <TransitionGroup
            name="list"
            tag="div"
            class="space-y-2"
          >
            <div
              v-for="arrival in arrivals"
              :key="`${arrival.lineId}-${arrival.expectedArrivalTime.getTime()}`"
              class="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 hover:bg-white dark:hover:bg-gray-800 transition-all border border-transparent"
               :class="{ 'border-yellow-400/30 dark:border-yellow-400/20 bg-yellow-50/50 dark:bg-yellow-900/10': arrival.isEstimate }"
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
                    <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 truncate">
                      <span>Línea {{ arrival.lineId }} · {{ formatArrivalTime(arrival.expectedArrivalTime) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Time remaining -->
                <div class="text-right shrink-0">
                  <div class="flex flex-col items-end">
                    <p 
                      class="text-xl font-bold tabular-nums"
                      :class="getTimeColor(arrival.minutesRemaining)"
                    >
                      {{ arrival.minutesRemaining }}
                    </p>
                    <div class="flex items-center gap-1">
                      <p class="text-xs text-gray-500 dark:text-gray-400 uppercase">min</p>
                      <span v-if="arrival.isEstimate" class="text-[10px] bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 px-1 rounded">
                        Estimación
                      </span>
                    </div>
                  </div>
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
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* List transitions */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.list-leave-active {
  position: absolute;
  width: 100%;
}

/* Simple Max-Height Transition per request */
.content {
  overflow: hidden;
}

.expand-enter-active,
.expand-leave-active {
  transition: max-height 0.5s ease;
  overflow: hidden;
  max-height: 500px;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
