<script setup lang="ts">
import { useArrivalNotification } from '~/composables/useArrivalNotification'
import type { TrackedNotification } from '~/composables/useArrivalNotification'

definePageMeta({
  layout: 'simple'
})

const { t } = useI18n()
const localePath = useLocalePath()
const notification = useArrivalNotification()

// SEO Meta
useSeoMeta({
  title: () => `${t('notifications.title')} - ${t('index.title')}`,
  description: () => t('notifications.description'),
})

const activeNotifications = notification.activeNotifications

function formatExpectedTime(dateString?: string): string {
    if (!dateString) return ''
    const d = new Date(dateString)
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function getTimeColor(minutes?: number): string {
    if (minutes === undefined) return 'text-gray-500'
    if (minutes <= 2) return 'text-red-500 dark:text-red-400'
    if (minutes <= 5) return 'text-orange-500 dark:text-orange-400'
    return 'text-primary-600 dark:text-primary-400'
}
</script>

<template>
  <div class="max-w-2xl mx-auto p-4 md:p-8 space-y-6 pb-32">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
        <UIcon name="i-lucide-bell" class="w-8 h-8 text-primary-500" />
        {{ $t('notifications.title') }}
      </h1>
      <p class="text-gray-500 dark:text-gray-400">{{ $t('notifications.subtitle') }}</p>
    </div>

    <!-- Empty State -->
    <div v-if="activeNotifications.length === 0" class="glass-card p-12 text-center border border-gray-100 dark:border-gray-800">
      <div class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
        <UIcon name="i-lucide-bell-off" class="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">{{ $t('notifications.empty_title') }}</h3>
      <p class="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">{{ $t('notifications.empty_desc') }}</p>
      
      <UButton
        :to="localePath('/map')"
        color="primary"
        variant="soft"
        icon="i-lucide-map"
      >
        {{ $t('notifications.go_to_map') }}
      </UButton>
    </div>

    <!-- Active Notifications List -->
    <div v-else class="space-y-4">
      <div class="flex justify-end mb-4">
          <UButton
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            size="sm"
            @click="notification.stopAllTracking"
          >
            {{ $t('notifications.clear_all') }}
          </UButton>
      </div>

      <TransitionGroup name="list" tag="div" class="space-y-4">
        <div
          v-for="item in activeNotifications"
          :key="item.id"
          class="glass-card p-5 border border-gray-100 dark:border-gray-800 relative group overflow-hidden"
          :class="{ 'border-yellow-400/30 dark:border-yellow-400/20 bg-yellow-50/50 dark:bg-yellow-900/10': item.isEstimate }"
        >
          <!-- Active Pulsing Indicator -->
          <div class="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
             <div class="absolute -top-8 -right-8 w-16 h-16 bg-primary-500/10 dark:bg-primary-400/10 rounded-full animate-pulse"></div>
          </div>

          <div class="flex items-start justify-between gap-4 relative z-10">
            <!-- Line & Stop Info -->
            <div class="flex gap-4">
              <!-- Line Badge -->
              <NuxtLink :to="localePath(`/line/${item.lineId}`)" class="shrink-0 hover:scale-105 transition-transform" :title="$t('notifications.view_line')">
                <div 
                  class="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm"
                  :class="getLineColor(item.lineId)"
                >
                  <span class="text-lg font-bold">{{ item.lineId }}</span>
                </div>
              </NuxtLink>

              <div>
                <h3 class="font-medium text-gray-900 dark:text-white line-clamp-1 pr-4">
                  {{ item.destination || $t('arrivals.unknown_destination') }}
                </h3>
                
                <NuxtLink :to="localePath(`/stop/${item.stopId}`)" class="inline-flex items-center gap-1.5 mt-1 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group/link" :title="$t('notifications.view_stop')">
                  <UIcon name="i-lucide-map-pin" class="w-4 h-4 shrink-0" />
                  <span class="line-clamp-1 border-b border-transparent group-hover/link:border-current transition-colors">
                    Stop {{ item.stopId }}
                  </span>
                  <UIcon name="i-lucide-arrow-up-right" class="w-3 h-3 opacity-0 -ml-1 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-all" />
                </NuxtLink>
              </div>
            </div>

            <!-- Time & Actions -->
            <div class="flex flex-col items-end gap-3 shrink-0">
              <!-- Delete Button -->
              <button 
                @click="notification.stopTracking(item.lineId, item.stopId)"
                class="p-2 -mr-2 -mt-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                :title="$t('notifications.stop_tracking')"
              >
                <UIcon name="i-lucide-x" class="w-5 h-5" />
              </button>

              <div class="text-right">
                <div v-if="item.minutesRemaining !== undefined">
                  <div class="flex items-baseline justify-end gap-1">
                    <span class="text-3xl font-bold tabular-nums tracking-tight" :class="getTimeColor(item.minutesRemaining)">
                      {{ item.minutesRemaining }}
                    </span>
                    <span class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">{{ $t('arrivals.minutes_short') || 'min' }}</span>
                  </div>
                  
                  <div class="flex items-center justify-end gap-1.5 mt-1">
                    <UIcon name="i-lucide-clock" class="w-3.5 h-3.5 text-gray-400" />
                    <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {{ formatExpectedTime(item.expectedArrival) }}
                    </span>
                  </div>
                </div>
                <!-- Loading State (waiting for first fetch) -->
                <div v-else class="flex flex-col items-end justify-center h-12">
                   <UIcon name="i-lucide-loader-2" class="w-5 h-5 animate-spin text-primary-500 mb-1" />
                   <span class="text-xs text-gray-400">{{ $t('notifications.estimating') }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Estimate Badge -->
          <div v-if="item.isEstimate" class="mt-3 pt-3 border-t border-yellow-100 dark:border-yellow-900/30 flex items-center justify-end">
            <span class="text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-md font-medium flex items-center gap-1.5">
              <UIcon name="i-lucide-alert-circle" class="w-3.5 h-3.5" />
              {{ $t('arrivals.estimate') }}
            </span>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
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
  width: calc(100% - 2rem);
}
@media (min-width: 768px) {
  .list-leave-active {
    width: calc(100% - 4rem);
  }
}
</style>
