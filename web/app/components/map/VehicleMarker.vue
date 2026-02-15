<script setup lang="ts">
import { MglMarker } from '@indoorequal/vue-maplibre-gl'
import type { BusVehicle } from '~/types/bus'
import { getLineColor } from '~/utils/bus'

export type MarkerState = 'disabled' | 'enabled' | 'highlighted'

const props = defineProps<{
  vehicle: BusVehicle
  state: MarkerState
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

    // Cancel any running animation
    if (animationFrame) cancelAnimationFrame(animationFrame)

    const duration = 2000
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

const containerClasses = computed(() => {
  switch (props.state) {
    case 'disabled':
      return 'opacity-40 grayscale scale-75 z-0'
    case 'highlighted':
      return 'opacity-100 scale-110 z-20'
    case 'enabled':
    default:
      return 'opacity-100 z-10'
  }
})

const isHighlighted = computed(() => props.state === 'highlighted')
</script>

<template>
  <MglMarker :coordinates="animatedCoords">
    <template #marker>
      <!-- Outer wrapper: CSS Zoom Scale (Class) -->
      <div class="zoom-scaler">
        <!-- Inner wrapper: Vue State Scale (Smooth Transition) - removed manual will-change -->
        <div
          class="vehicle-marker-wrapper relative flex flex-col items-center cursor-pointer transition-all duration-300"
          :class="containerClasses"
          @click.stop="emit('click', vehicle)"
        >
          <!-- Selection/Ping Halo -->
          <div
            class="absolute inset-0 -m-1 rounded-xl transition-all duration-300"
            :class="[
              lineColor,
              isHighlighted
                ? 'opacity-100 ring-4 ring-yellow-400 ring-opacity-50'
                : 'animate-ping opacity-25'
            ]"
          />

          <!-- Bus body (Pill shape) -->
          <div
            class="relative z-10 flex items-center gap-1.5 px-2 py-1 rounded-xl border-2 border-white shadow-md transition-all duration-300 group-hover:scale-110 min-w-[3rem] justify-center"
            :class="[
              lineColor,
              isHighlighted ? 'scale-125 ring-2 ring-yellow-400' : ''
            ]"
          >
            <!-- Bus Icon -->
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
  transform: scale(1);
}

/* Discrete Zoom Steps based on parent class in BaseMap */
:global(.z-low) .zoom-scaler {
  transform: scale(0.65);
}
:global(.z-med) .zoom-scaler {
  transform: scale(0.85);
}
:global(.z-high) .zoom-scaler {
  transform: scale(1.0);
}
</style>
