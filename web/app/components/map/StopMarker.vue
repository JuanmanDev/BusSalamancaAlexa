<script setup lang="ts">
import { MglMarker } from '@indoorequal/vue-maplibre-gl'
import type { BusStop } from '~/types/bus'
import { generateStopMarkerSVG } from '~/utils/bus'

export type MarkerState = 'disabled' | 'enabled' | 'highlighted'

const props = defineProps<{
  stop: BusStop
  state: MarkerState
}>()

const emit = defineEmits<{
  click: [stop: BusStop]
}>()

const coordinates = computed<[number, number]>(() => [props.stop.longitude!, props.stop.latitude!])

// Fixed base sizes for SVG generation (scaling is handled by CSS)
const markerSize = computed(() => {
  return props.state === 'highlighted' ? 36 : 24
})

const svgContent = computed(() => {
  const lineIds = props.stop.lines || []
  return generateStopMarkerSVG(lineIds, markerSize.value, props.state === 'highlighted')
})

const stateClasses = computed(() => {
  switch (props.state) {
    case 'disabled':
      return 'opacity-30 grayscale scale-75'
    case 'highlighted':
      return 'scale-125 z-50'
    case 'enabled':
    default:
      return 'hover:scale-110'
  }
})
</script>

<template>
  <MglMarker :coordinates="coordinates">
    <template #marker>
      <!-- Outer wrapper handles Zoom Scale (CSS Class) - WITH TRANSITION -->
      <div class="zoom-scaler">
        <!-- Inner wrapper handles State Scale/Hover (Vue) - WITH TRANSITION -->
        <div
          class="stop-marker-wrapper cursor-pointer relative"
          style="transition: opacity 300ms ease, transform 300ms ease, filter 300ms ease;"
          :class="stateClasses"
          @click.stop="emit('click', stop)"
        >
          <div v-html="svgContent" />
          <div
            v-if="state === 'highlighted'"
            class="absolute inset-0 rounded-full ring-4 ring-amber-400 ring-opacity-60 animate-pulse"
            style="margin: -4px;"
          />
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
  transform: scale(0.6);
}
:global(.z-med) .zoom-scaler {
  transform: scale(0.8);
}
:global(.z-high) .zoom-scaler {
  transform: scale(1.0);
}
</style>
