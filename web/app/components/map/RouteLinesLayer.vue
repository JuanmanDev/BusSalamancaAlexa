<script setup lang="ts">
import { MglGeoJsonSource, MglLineLayer } from '@indoorequal/vue-maplibre-gl'
import type { RouteOption } from '~/types/bus'
import { getLineColorHex } from '~/utils/bus'

const props = defineProps<{
  selectedRoute: RouteOption | null
  linesToDraw: { id: string; color: string; points: { lat: number; lng: number }[]; width?: number; opacity?: number }[]
}>()

const colorMode = useColorMode()

const geojsonData = computed(() => {
  const features: any[] = []

  // 1. Process Route (Navigation)
  if (props.selectedRoute) {
    props.selectedRoute.segments.forEach(seg => {
      const coords = seg.geometry?.map(p => [p.lng, p.lat]) ||
        [[seg.from.location.lng, seg.from.location.lat], [seg.to.location.lng, seg.to.location.lat]]

      if (seg.type === 'walk') {
        features.push({
          type: 'Feature',
          properties: { type: 'walk' },
          geometry: { type: 'LineString', coordinates: coords }
        })
      } else if (seg.type === 'bus') {
        const hex = getLineColorHex(seg.lineId || '0')
        features.push({
          type: 'Feature',
          properties: { type: 'bus', color: hex },
          geometry: { type: 'LineString', coordinates: coords }
        })
      }
    })
  }

  // 2. Process Custom Lines
  if (props.linesToDraw && props.linesToDraw.length > 0) {
    props.linesToDraw.forEach(line => {
      const coords = line.points.map(p => [p.lng, p.lat])
      features.push({
        type: 'Feature',
        properties: {
          type: 'bus',
          color: line.color,
          width: line.width,
          opacity: line.opacity ?? 0.8
        },
        geometry: { type: 'LineString', coordinates: coords }
      })
    })
  }

  return { type: 'FeatureCollection' as const, features }
})

const walkPaint = computed(() => ({
  'line-color': colorMode.value === 'dark' ? '#d1d5db' : '#374151',
  'line-width': ['interpolate', ['linear'], ['zoom'],
    10, 1,
    14, 3,
    18, 5
  ],
  'line-dasharray': [0, 2],
  'line-opacity': 0.8,
  'line-opacity-transition': { duration: 600, delay: 0 },
}) as any)

const busPaint = computed(() => ({
  'line-color': ['get', 'color'],
  'line-width': ['interpolate', ['linear'], ['zoom'],
    10, ['coalesce', ['*', ['coalesce', ['get', 'width'], 5], 0.3], 1.5],
    14, ['coalesce', ['get', 'width'], 5],
    18, ['coalesce', ['*', ['coalesce', ['get', 'width'], 5], 1.5], 7.5]
  ],
  'line-opacity': ['coalesce', ['get', 'opacity'], 0.8],
  'line-opacity-transition': { duration: 600, delay: 0 },
}) as any)

const walkFilter = ['==', ['get', 'type'], 'walk'] as any
const busFilter = ['==', ['get', 'type'], 'bus'] as any

const walkLayout = { 'line-join': 'round' as const, 'line-cap': 'round' as const }
const busLayout = { 'line-join': 'round' as const, 'line-cap': 'round' as const }
</script>

<template>
  <MglGeoJsonSource source-id="route-path" :data="geojsonData">
    <MglLineLayer
      layer-id="route-walk"
      :layout="walkLayout"
      :paint="walkPaint"
      :filter="walkFilter"
    />
    <MglLineLayer
      layer-id="route-bus"
      :layout="busLayout"
      :paint="busPaint"
      :filter="busFilter"
    />
  </MglGeoJsonSource>
</template>
