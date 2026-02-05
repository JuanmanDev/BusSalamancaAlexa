/**
 * Composable for SIRI bus service integration
 * Uses Nuxt API endpoints that proxy requests to the SIRI service (avoiding CORS)
 */

import type { BusLine, BusStop, BusArrival, BusVehicle } from '~/types/bus'

export function useBusService() {
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    async function fetchLines(): Promise<BusLine[]> {
        const data = await $fetch<BusLine[]>('/api/bus/lines')
        return data || []
    }

    async function fetchStops(): Promise<BusStop[]> {
        const data = await $fetch<BusStop[]>('/api/bus/stops')
        return data || []
    }

    async function fetchArrivals(stopId: string): Promise<BusArrival[]> {
        const data = await $fetch<any[]>(`/api/bus/stop/${stopId}/arrivals`)
        if (!data) return []

        // Convert ISO strings back to Date objects
        return data.map(item => ({
            ...item,
            expectedArrivalTime: new Date(item.expectedArrivalTime),
            aimedArrivalTime: item.aimedArrivalTime ? new Date(item.aimedArrivalTime) : undefined,
        }))
    }

    async function fetchVehicles(): Promise<BusVehicle[]> {
        const data = await $fetch<BusVehicle[]>('/api/bus/vehicles')
        return data || []
    }

    return {
        isLoading,
        error,
        fetchLines,
        fetchStops,
        fetchArrivals,
        fetchVehicles,
    }
}
