import { fetchArrivals } from '../../../../utils/siri'
import { recordArrival } from '../../../../utils/arrivalHistory'

// In-memory cache for stop arrivals: stopId -> { data, timestamp }
const arrivalsCache = new Map<string, { data: any[], timestamp: number }>()
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes in ms

export default defineEventHandler(async (event) => {
    const stopId = getRouterParam(event, 'id')

    if (!stopId) {
        throw createError({
            statusCode: 400,
            message: 'Stop ID is required',
        })
    }

    const now = Date.now()
    const cached = arrivalsCache.get(stopId)

    // Fetch fresh arrivals from SIRI
    let newArrivals: any[] = []
    try {
        newArrivals = await fetchArrivals(stopId)

        // Record to history store for travel time learning
        for (const arrival of newArrivals) {
            if (arrival.vehicleRef && arrival.lineId) {
                recordArrival(
                    stopId,
                    arrival.lineId,
                    arrival.vehicleRef,
                    new Date(arrival.expectedArrivalTime).getTime()
                )
            }
        }
    } catch (error) {
        // If fetch fails but we have a valid cache, return cached data as fallback
        if (cached && (now - cached.timestamp < CACHE_TTL)) {
            console.warn(`[Arrivals] Fetch failed for stop ${stopId}, returning cached data.`)
            return cached.data
        }
        throw error
    }

    if (!cached) {
        // No previous data to compare, save and return
        arrivalsCache.set(stopId, { data: newArrivals, timestamp: now })
        return newArrivals
    }

    // Interpolation logic
    // We want to keep old arrivals that are missing from newArrivals IF their expected time
    // was within +/- 3 minutes of "now", and mark them as estimated.
    const finalArrivals = [...newArrivals]
    const currentLineIds = new Set(newArrivals.map(a => a.lineId))

    for (const oldArrival of cached.data) {
        // If the line is entirely missing from new results
        if (!currentLineIds.has(oldArrival.lineId)) {
            const expectedTime = new Date(oldArrival.expectedArrivalTime).getTime()
            const diffMinutes = (expectedTime - now) / 60000

            // If the old arrival was expected between 3 mins ago and 3 mins from now
            if (diffMinutes >= -3 && diffMinutes <= 3) {
                // Update the remaining minutes relative to current time
                const minutesRemaining = Math.max(0, Math.round(diffMinutes))

                finalArrivals.push({
                    ...oldArrival,
                    minutesRemaining,
                    isEstimate: true
                })
                currentLineIds.add(oldArrival.lineId) // prevent multiple additions if cache had dupes
            }
        }
    }

    // Sort again by minutes remaining
    finalArrivals.sort((a, b) => a.minutesRemaining - b.minutesRemaining)

    // Update Cache
    arrivalsCache.set(stopId, { data: finalArrivals, timestamp: now })

    return finalArrivals
})
