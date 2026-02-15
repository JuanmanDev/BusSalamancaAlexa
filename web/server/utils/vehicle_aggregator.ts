
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
}

// Hub stops chosen based on line coverage analysis (Salamanca)
// 41: Avda. Mirat, 43 (13 lines)
// 103: Pº. Canalejas, 12 (9 lines)
// 100: Avda. De Los Maristas, 1 (5 lines)
// 36: Pº. San Vicente, 106 (9 lines)
// 222: C/ Gran Vía, 38 (6 lines)
const HUB_STOPS = ['41', '103', '100', '36', '222']

// Cache for aggregated vehicles
let vehicleAggregatorCache: { data: BusVehicle[], timestamp: number } | null = null
const AGGREGATOR_CACHE_TTL = 3000 // 3 seconds

export async function fetchVehiclesFromHubs(): Promise<BusVehicle[]> {
    const now = Date.now()
    if (vehicleAggregatorCache && (now - vehicleAggregatorCache.timestamp < AGGREGATOR_CACHE_TTL)) {
        // console.log('[Aggregator] Serving vehicles from cache')
        return vehicleAggregatorCache.data
    }

    try {
        console.log(`[Aggregator] Fetching vehicles from ${HUB_STOPS.length} hubs...`)
        const promises = HUB_STOPS.map(id => fetchArrivals(id))
        const results = await Promise.all(promises)

        const vehiclesMap = new Map<string, BusVehicle>()
        let totalArrivals = 0

        results.flat().forEach(arrival => {
            totalArrivals++
            // Only consider arrivals with valid vehicle info and location
            if (arrival.vehicleRef && arrival.location) {
                // If we already have this vehicle, we could check which one is fresher/closer?
                // For now, first one wins or overwrite? Let's overwrite to get latest parsed.
                vehiclesMap.set(arrival.vehicleRef, {
                    id: arrival.vehicleRef,
                    lineId: arrival.lineId,
                    lineName: arrival.lineName,
                    latitude: arrival.location.latitude,
                    longitude: arrival.location.longitude,
                    destination: arrival.destination,
                    bearing: 0, // Not available in arrivals
                    delay: 0 // Not strictly available in simplified arrival object
                })
            }
        })

        const uniqueVehicles = Array.from(vehiclesMap.values())
        console.log(`[Aggregator] Found ${uniqueVehicles.length} unique vehicles from ${totalArrivals} arrivals.`)

        vehicleAggregatorCache = {
            data: uniqueVehicles,
            timestamp: Date.now()
        }

        return uniqueVehicles
    } catch (e) {
        console.error('[Aggregator] detailed error', e)
        return []
    }
}
