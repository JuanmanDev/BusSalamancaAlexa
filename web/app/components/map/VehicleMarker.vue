<script setup lang="ts">
import { MglMarker } from '@indoorequal/vue-maplibre-gl'
import type { BusVehicle } from '~/types/bus'
import { getLineColor } from '~/utils/bus'

const props = defineProps<{
  vehicle: BusVehicle
  now: Date // Shared timer from BaseMap
  state?: 'highlighted' | 'dimmed' | 'normal'
}>()

const emit = defineEmits<{
  click: [vehicle: BusVehicle]
}>()

// ===== Smooth Coordinate Animation =====
const animatedCoords = ref<[number, number]>([props.vehicle.longitude, props.vehicle.latitude])
let animationFrame: number | null = null

watch(
  () => [props.vehicle.longitude, props.vehicle.latitude] as [number, number],
  ([newLng, newLat]) => {
    const [oldLng, oldLat] = animatedCoords.value
    if (oldLng === newLng && oldLat === newLat) return

    if (animationFrame) cancelAnimationFrame(animationFrame)

    const duration = 3000
    const startTime = performance.now()

    function animate(now: number) {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)

      animatedCoords.value = [
        oldLng + (newLng - oldLng) * ease,
        oldLat + (newLat - oldLat) * ease,
      ]

      if (t < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
  }
)

onBeforeUnmount(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
})

const lineColor = computed(() => getLineColor(props.vehicle.lineId))

// CSS data classes for the cascade approach
const markerClasses = computed(() => {
  const classes: string[] = ['vehicle-marker', `line-${props.vehicle.lineId}`, `vehicle-${props.vehicle.id}`]
  if (props.state === 'dimmed') classes.push('is-dimmed')
  if (props.state === 'highlighted') classes.push('is-highlighted')
  return classes
})

// Staleness (using shared now prop)
const dataAge = computed(() => props.vehicle.timestamp ? props.now.getTime() - props.vehicle.timestamp : 0)
const isDelayed = computed(() => dataAge.value > 7000)
const isStale = computed(() => dataAge.value > 30000)
</script>

<template>
  <MglMarker :coordinates="animatedCoords">
    <template #marker>
      <div class="zoom-scaler">
        <div
          class="vehicle-marker-wrapper relative flex flex-col items-center cursor-pointer vehicle-transition"
          :class="markerClasses"
          @click.stop="emit('click', vehicle)"
        >
          <!-- Ping Halo — only rendered when vehicle is active and not delayed -->
          <div
            v-if="!isDelayed"
            class="absolute inset-0 -m-1 rounded-xl animate-ping opacity-25 vehicle-halo"
            :class="lineColor"
          />

          <!-- Bus body (Pill shape) -->
          <div
            class="relative z-10 flex items-center gap-1.5 px-2 py-1 rounded-xl border-2 border-white shadow-md body-transition min-w-[3rem] justify-center"
            :class="lineColor"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white w-5 h-5">
              <path d="M8 6v6"/>
              <path d="M15 6v6"/>
              <path d="M2 12h19.6"/>
              <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
              <circle cx="7" cy="18" r="2"/>
              <path d="M9 18h5"/>
              <circle cx="16" cy="18" r="2"/>
            </svg>
            <span class="text-white font-bold text-s leading-none">{{ vehicle.lineId }}</span>
            <div v-if="isStale" class="absolute -top-1 -right-1 bg-red-500 rounded-full border border-white flex items-center justify-center p-0.5 shadow-sm">
              <UIcon name="i-lucide-alert-triangle" class="w-2.5 h-2.5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </MglMarker>
</template>

<style scoped>
.zoom-scaler {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center;
  transform: scale(var(--marker-zoom-scale, 1));
  contain: layout style;
}

/* Specific property transitions instead of transition-all */
.vehicle-transition {
  transition-property: opacity, transform, filter;
  transition-duration: 300ms;
  transition-timing-function: ease;
}

.body-transition {
  transition-property: transform;
  transition-duration: 300ms;
  transition-timing-function: ease;
}

/* Default state: enabled */
.vehicle-marker {
  opacity: 1;
  filter: none;
  z-index: 10;
}

.vehicle-marker.is-dimmed {
  opacity: 0.35;
  z-index: 0;
}

.vehicle-marker.is-dimmed .vehicle-halo {
  display: none;
}

.vehicle-marker.is-highlighted {
  opacity: 1;
  transform: scale(1.1);
  z-index: 20;
}

/* Matching markers get re-enabled by dynamic <style> in BaseMap */
</style>
