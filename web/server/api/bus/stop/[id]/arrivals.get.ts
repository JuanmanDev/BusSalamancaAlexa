import { fetchArrivals } from '../../../../utils/siri'
import { recordArrival } from '../../../../utils/arrivalHistory'
import { isServiceAvailable } from '../../../../utils/serviceStatus'

// In-memory cache for stop arrivals: stopId -> { data, timestamp }
const arrivalsCache = new Map<string, { data: any[], timestamp: number }>()
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes in ms

// SIRI is a third-party service and the only source of arrivals, so the number of calls it gets
// should depend on how many stops are being watched, not on how many watchers there are. Every
// open stop page polls this route every 10s and the Alexa widget pushes every 30s; without the
// window below, ten viewers of one stop meant ten SIRI calls per poll.
const FRESH_TTL = Number(process.env.ARRIVALS_FRESH_TTL_MS) || 8000

// Requests that arrive while a SIRI call is already in flight for the same stop wait for that
// call instead of starting another.
const inFlight = new Map<string, Promise<any[]>>()

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

    if (cached && (now - cached.timestamp) < FRESH_TTL) {
        return cached.data
    }

    // SIRI answers 200 with nothing when it is unwell, which is indistinguishable from a stop
    // with no buses due. If it cannot even produce the stop catalogue it is down, and saying
    // "no buses are coming" would be a lie — so say nothing rather than something wrong.
    if (!await isServiceAvailable()) {
        throw createError({
            statusCode: 503,
            statusMessage: 'Bus service unavailable',
            data: { reason: 'service_unavailable' },
        })
    }

    const existing = inFlight.get(stopId)
    if (existing) {
        return await existing
    }

    const pending = resolveArrivals(stopId).finally(() => inFlight.delete(stopId))
    inFlight.set(stopId, pending)
    return await pending
})

async function resolveArrivals(stopId: string) {
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
}
