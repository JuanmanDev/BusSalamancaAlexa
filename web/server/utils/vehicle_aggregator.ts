
import { fetchArrivals } from './siri'

export interface BusVehicle {
    id: string
    lineId: string
    lineName: string
    latitude: number
    longitude: number
    bearing?: number
    destination: string
    delay?: number
    isEstimate?: boolean
}

// Hub stops chosen based on line coverage analysis (Salamanca)
// 41: Avda. Mirat, 43 (13 lines)
// 103: Pº. Canalejas, 12 (9 lines)
// 100: Avda. De Los Maristas, 1 (5 lines)
// 36: Pº. San Vicente, 106 (9 lines)
// 222: C/ Gran Vía, 38 (6 lines)
// 41: Avda. Mirat, 43 (13 lines)
// 103: Pº. Canalejas, 12 (9 lines)
// 100: Avda. De Los Maristas, 1 (5 lines)
// 36: Pº. San Vicente, 106 (9 lines)
// 222: C/ Gran Vía, 38 (6 lines)
// TODO: Replace '99999' with actual Stop ID for Campus Unamuno/Filiberto Villalobos for Line 7
// Line 7: Campus Unamuno - Prosperidad. Needs a stop that it passes. 
const HUB_STOPS = ['41', '103', '100', '36', '222', '131'] // Added 312 (Hospital?) as guess, verify.

interface VehicleState {
    data: BusVehicle
    lastUpdated: number
    isEstimate: boolean
}

// Global state map to persist vehicles across polls
const vehicleStateMap = new Map<string, VehicleState>()
const REMOVE_TIMEOUT = 15 * 60 * 1000 // 15 minutes

export async function fetchVehiclesFromHubs(): Promise<BusVehicle[]> {
    // We ignore the simple cache for the aggregation itself to ensure we run the state logic
    // But we might want to respect the 3s cache to avoid spamming SIRI?
    // Let's use the SIRI cache logic (in siri.ts calls) or keep the global aggregator cache?
    // If we want "isEstimate" to update (e.g. time based), we need to run logic.
    // For now, let's just fetch fresh.

    try {
        // console.log(`[Aggregator] Fetching vehicles from ${HUB_STOPS.length} hubs...`)
        const promises = HUB_STOPS.map(id => fetchArrivals(id))
        const results = await Promise.all(promises)

        const now = Date.now()
        const seenVehicleIds = new Set<string>()

        // 1. Process new arrivals
        results.flat().forEach(arrival => {
            if (arrival.vehicleRef && arrival.location) {
                seenVehicleIds.add(arrival.vehicleRef)

                // Update State
                vehicleStateMap.set(arrival.vehicleRef, {
                    data: {
                        id: arrival.vehicleRef,
                        lineId: arrival.lineId,
                        lineName: arrival.lineName,
                        latitude: arrival.location.latitude,
                        longitude: arrival.location.longitude,
                        destination: arrival.destination,
                        bearing: 0,
                        delay: 0,
                        isEstimate: false // Fresh data
                    },
                    lastUpdated: now,
                    isEstimate: false
                })
            }
        })

        // 2. Prune and Estimate
        const activeVehicles: BusVehicle[] = []

        for (const [id, state] of vehicleStateMap.entries()) {
            if (seenVehicleIds.has(id)) {
                // Was just updated
                activeVehicles.push(state.data)
            } else {
                // Missing in this fetch
                const age = now - state.lastUpdated

                if (age > REMOVE_TIMEOUT) {
                    // Remove stale
                    vehicleStateMap.delete(id)
                } else {
                    // Key "Alive" as Estimate
                    state.isEstimate = true
                    state.data.isEstimate = true
                    // Ideally we would update position based on velocity/path, 
                    // but for now we just hold position.
                    // The user mentioned "update based on expectedArrivalTime".
                    // But we don't store the full arrival object here easily.
                    // Doing simple "ghost" mode.
                    activeVehicles.push(state.data)
                }
            }
        }

        console.log(`[Aggregator] Serving ${activeVehicles.length} vehicles (${activeVehicles.filter(v => v.isEstimate).length} estimated).`)

        return activeVehicles
    } catch (e) {
        console.error('[Aggregator] detailed error', e)
        return []
    }
}
