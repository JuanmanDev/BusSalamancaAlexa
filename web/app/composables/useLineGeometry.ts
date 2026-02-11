import type { BusLine, BusStop } from '~/types/bus'
import { getLineColorHex } from '~/utils/bus'
import { fetchRouteGeometry } from '~/utils/osrm'

export function useLineGeometry() {
    const { data: allStops } = useBusStops()

    async function getLineGeometry(lineId: string, lineInfo: BusLine, lineStops: BusStop[]) {
        const hex = getLineColorHex(lineId)
        const segments: { id: string, color: string, points: { lat: number, lng: number }[], uniqueId: string }[] = []
        const directionsToFetch: { uniqueId: string; points: { lat: number; lng: number }[] }[] = []

        // 1. Construct initial segments (straight lines) based on directions or fallback
        if (lineInfo.directions && lineInfo.directions.length > 0) {
            lineInfo.directions.forEach((dir, idx) => {
                const points: { lat: number; lng: number }[] = []

                const stopsData = (allStops.value as BusStop[]) || []

                dir.stops.forEach(stopRef => {
                    const stop = stopsData.find(s => s.id === stopRef.id)
                    if (stop && stop.latitude && stop.longitude) {
                        points.push({ lat: stop.latitude, lng: stop.longitude })
                    }
                })

                if (points.length > 1) {
                    const uniqueId = `${lineId}-${dir.id || idx}`

                    segments.push({
                        id: lineId,
                        uniqueId,
                        color: hex,
                        points: points
                    })

                    directionsToFetch.push({
                        uniqueId,
                        points: points
                    })
                }
            })
        } else {
            // Fallback
            const points: { lat: number; lng: number }[] = []
            const validStops = lineStops.filter(s => s.latitude && s.longitude)
            validStops.forEach(s => {
                points.push({ lat: s.latitude!, lng: s.longitude! })
            })

            if (points.length > 1) {
                const uniqueId = `${lineId}-main`
                segments.push({
                    id: lineId,
                    uniqueId,
                    color: hex,
                    points: points
                })
                directionsToFetch.push({
                    uniqueId,
                    points: points
                })
            }
        }

        // 2. Return a function/promise to upgrade to OSRM
        const fetchDetailed = async () => {
            if (directionsToFetch.length === 0) return segments

            const detailedSegments = await Promise.all(directionsToFetch.map(async (dir) => {
                // Cache key
                const cacheKey = `route-geo-${dir.uniqueId}-${dir.points.length}`

                // Try client cache (useState/asyncData) or call server
                // Since we are in a composable/client-side interaction, direct server call is fine, 
                // but we can wrap in useAsyncData if we want hydration transport, 
                // but here it's mostly client-side interaction.
                // We'll use $fetch directly but we rely on the SERVER caching we implemented.

                try {
                    const geometry = await $fetch<{ lat: number, lng: number }[]>('/api/bus/route-geometry', {
                        method: 'POST',
                        body: { points: dir.points }
                    })

                    return {
                        id: lineId,
                        uniqueId: dir.uniqueId,
                        color: hex,
                        points: geometry || dir.points
                    }
                } catch (e) {
                    console.error('OSRM fetch failed', e)
                    // Return straight line on failure
                    return segments.find(s => s.uniqueId === dir.uniqueId)!
                }
            }))
            return detailedSegments
        }

        return {
            initial: segments,
            fetchDetailed
        }
    }

    return {
        getLineGeometry
    }
}
