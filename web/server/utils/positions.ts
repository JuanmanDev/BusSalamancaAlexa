import type { BusVehicle } from './vehicle_aggregator'

let positionsCache: { data: BusVehicle[], timestamp: number } | null = null
const CACHE_TTL = 3000 // 3 seconds, same as current vehicle refresh

export async function fetchPositions(): Promise<BusVehicle[]> {
    const now = Date.now()

    if (positionsCache && (now - positionsCache.timestamp < CACHE_TTL)) {
        return positionsCache.data
    }

    try {
        const response = await fetch("https://salamancadetransportes.com/api/siri/positions", {
            headers: {
                "accept": "*/*",
                "accept-language": "es",
                "cache-control": "no-cache",
                "pragma": "no-cache",
                "priority": "u=1, i",
                "sec-ch-ua": "\"Google Chrome\";v=\"149\", \"Chromium\";v=\"149\", \"Not)A;Brand\";v=\"24\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin"
            },
            referrer: "https://salamancadetransportes.com/mapa-en-vivo",
            method: "GET",
            mode: "cors"
        })

        if (!response.ok) {
            throw new Error(`Positions API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        
        if (!data || !Array.isArray(data.data)) {
            console.warn('[Positions] Unexpected response format from positions API', data)
            return []
        }

        const vehicles: BusVehicle[] = data.data.map((v: any) => ({
            id: String(v.vehicleId),
            lineId: String(v.lineCode),
            lineName: v.lineName || '',
            longitude: parseFloat(v.longitude),
            latitude: parseFloat(v.latitude),
            bearing: v.bearing ? parseFloat(v.bearing) : 0,
            speed: v.speed ? parseFloat(v.speed) : 0,
            destination: '', // Missing in this API, but rarely used on map vs line
            isEstimate: false,
            timestamp: now
        }))

        positionsCache = { data: vehicles, timestamp: now }
        return vehicles

    } catch (e) {
        console.error('[Positions] Failed to fetch positions:', e)
        throw e // Throw so the caller can fall back to the aggregator
    }
}
