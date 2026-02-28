<script setup lang="ts">
import { MglMarker } from '@indoorequal/vue-maplibre-gl'
import type { BusStop } from '~/types/bus'
import { generateStopMarkerSVG } from '~/utils/bus'

const props = defineProps<{
  stop: BusStop
  state?: 'highlighted' | 'dimmed' | 'normal'
}>()

const emit = defineEmits<{
  click: [stop: BusStop]
}>()

const coordinates = computed<[number, number]>(() => [props.stop.longitude!, props.stop.latitude!])

// Fixed base size — CSS handles all scaling
const svgContent = computed(() => {
  const lineIds = props.stop.lines || []
  return generateStopMarkerSVG(lineIds, 24, false)
})

// CSS data classes for the cascade approach
// Parent (BaseMap root) sets `hl-line-{id}` / `hl-stop-{id}`, and the dynamic <style>
// in BaseMap matches `.hl-line-{id} .line-{id}` to re-enable matching markers.
const markerClasses = computed(() => {
  const classes: string[] = ['stop-marker']
  // Add stop ID class
  classes.push(`stop-${props.stop.id}`)
  // Add line ID classes for each line this stop serves
  const lineIds = props.stop.lines || []
  lineIds.forEach(lineId => classes.push(`line-${lineId}`))
  if (props.state === 'dimmed') classes.push('is-dimmed')
  if (props.state === 'highlighted') classes.push('is-highlighted')
  return classes
})
</script>

<template>
  <MglMarker :coordinates="coordinates">
    <template #marker>
      <div class="zoom-scaler">
        <div
          class="stop-marker-wrapper cursor-pointer relative marker-transition"
          :class="markerClasses"
          @click.stop="emit('click', stop)"
        >
          <div v-html="svgContent" />
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
.marker-transition {
  transition-property: opacity, transform, filter;
  transition-duration: 300ms;
  transition-timing-function: ease;
}

/* Default state: enabled */
.stop-marker {
  opacity: 1;
  filter: none;
  transform: scale(1);
}

.stop-marker:hover {
  transform: scale(1.1);
}

.stop-marker.is-dimmed {
  opacity: 0.35;
}

.stop-marker.is-highlighted {
  opacity: 1;
  transform: scale(1.15);
  z-index: 50;
}

/* Matching markers get re-enabled by dynamic <style> in BaseMap */
</style>
