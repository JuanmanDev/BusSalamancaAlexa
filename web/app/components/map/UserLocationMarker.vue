<script setup lang="ts">
import { MglMarker } from '@indoorequal/vue-maplibre-gl'

const props = defineProps<{
  location: { lat: number; lng: number }
}>()

const coordinates = computed<[number, number]>(() => [props.location.lng, props.location.lat])
</script>

<template>
  <MglMarker :coordinates="coordinates">
    <template #marker>
      <div class="relative">
        <div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
        <div class="absolute inset-0 w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-50" />
      </div>
    </template>
  </MglMarker>
</template>
