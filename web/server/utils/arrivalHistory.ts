/**
 * Arrival History Store — Server-side in-memory database
 *
 * Records arrival observations from SIRI data and computes segment travel statistics.
 * Survives across requests within the Nitro process lifetime.
 * Designed per 12-factor principles: stateless process with ephemeral storage.
 *
 * Data retention: 7 days (configurable)
 */

// --- Types ---

interface ArrivalObservation {
    stopId: string
    lineId: string
    vehicleRef: string
    expectedArrivalTime: number  // ms timestamp
    recordedAt: number           // ms timestamp
}

interface SegmentTravelRecord {
    fromStopId: string
    toStopId: string
    lineId: string
    travelTimeSeconds: number
    recordedAt: number
}

export interface SegmentStats {
    fromStopId: string
    toStopId: string
    lineId: string
    avgSeconds: number
    stdDevSeconds: number
    sampleCount: number
}

// --- Config ---

const DATA_RETENTION_MS = 7 * 24 * 60 * 60 * 1000  // 7 days
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000          // Clean up every hour
const MIN_SAMPLES_FOR_STATS = 2

// --- State (module-level singletons) ---

// Raw observations keyed by `stopId|lineId|vehicleRef` → latest observation
const latestObservations = new Map<string, ArrivalObservation>()

// Computed segment travel times
const segmentRecords: SegmentTravelRecord[] = []

// Cached stats (recomputed periodically)
let cachedStats: SegmentStats[] = []
let lastStatsComputation = 0
const STATS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Line stop sequences (built when first lines data arrives)
const lineStopSequences = new Map<string, Map<string, string[]>>()

let cleanupTimer: ReturnType<typeof setInterval> | null = null

// --- Public API ---

/**
 * Register the stop sequences for a line (call once when lines data is fetched)
 */
export function registerLineStops(lineId: string, directions: { id: string, stops: { id: string, order: number }[] }[]): void {
    const dirMap = new Map<string, string[]>()
    for (const dir of directions) {
        const sortedStops = [...dir.stops].sort((a, b) => a.order - b.order)
        dirMap.set(dir.id, sortedStops.map(s => s.id))
    }
    lineStopSequences.set(lineId, dirMap)
}

/**
 * Record an arrival observation. Called by the arrivals API endpoint.
 * Automatically detects when a vehicle has traveled between consecutive stops
 * and records the travel time.
 */
export function recordArrival(
    stopId: string,
    lineId: string,
    vehicleRef: string | undefined,
    expectedArrivalTime: number
): void {
    if (!vehicleRef || !lineId || !stopId) return

    const key = `${lineId}|${vehicleRef}`
    const now = Date.now()

    const previous = latestObservations.get(key)

    // Check if this vehicle was previously seen at a different stop on the same line
    if (previous && previous.stopId !== stopId) {
        // Find if these stops are consecutive in any direction of this line
        const directions = lineStopSequences.get(lineId)
        if (directions) {
            for (const [, sequence] of directions) {
                const prevIdx = sequence.indexOf(previous.stopId)
                const currIdx = sequence.indexOf(stopId)

                // Only record if stops are consecutive (within 3 stops, to handle skip patterns)
                if (prevIdx >= 0 && currIdx >= 0 && currIdx > prevIdx && currIdx - prevIdx <= 3) {
                    const travelTimeMs = now - previous.recordedAt
                    const travelTimeSeconds = travelTimeMs / 1000

                    // Sanity check: travel time between 10s and 30min
                    if (travelTimeSeconds >= 10 && travelTimeSeconds <= 1800) {
                        // Record for each consecutive pair in between
                        for (let i = prevIdx; i < currIdx; i++) {
                            const segmentTime = travelTimeSeconds / (currIdx - prevIdx) // Distribute evenly
                            segmentRecords.push({
                                fromStopId: sequence[i]!,
                                toStopId: sequence[i + 1]!,
                                lineId,
                                travelTimeSeconds: segmentTime,
                                recordedAt: now,
                            })
                        }
                    }
                }
            }
        }
    }

    // Update latest observation
    latestObservations.set(key, {
        stopId,
        lineId,
        vehicleRef,
        expectedArrivalTime,
        recordedAt: now,
    })

    // Start cleanup timer if not running
    if (!cleanupTimer) {
        cleanupTimer = setInterval(cleanup, CLEANUP_INTERVAL_MS)
    }
}

/**
 * Get computed segment travel statistics
 */
export function getSegmentStats(): SegmentStats[] {
    const now = Date.now()

    // Return cached if fresh
    if (now - lastStatsComputation < STATS_CACHE_TTL && cachedStats.length > 0) {
        return cachedStats
    }

    cachedStats = computeStats()
    lastStatsComputation = now
    return cachedStats
}

/**
 * Get stats for the diagnostic endpoint
 */
export function getHistoryDiagnostics(): {
    observationCount: number
    segmentRecordCount: number
    statsCount: number
    lineSequencesLoaded: number
} {
    return {
        observationCount: latestObservations.size,
        segmentRecordCount: segmentRecords.length,
        statsCount: getSegmentStats().length,
        lineSequencesLoaded: lineStopSequences.size,
    }
}

// --- Internals ---

function computeStats(): SegmentStats[] {
    const now = Date.now()
    const cutoff = now - DATA_RETENTION_MS

    // Group records by segment key
    const groups = new Map<string, number[]>()

    for (const record of segmentRecords) {
        if (record.recordedAt < cutoff) continue

        const key = `${record.fromStopId}|${record.toStopId}|${record.lineId}`
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(record.travelTimeSeconds)
    }

    const stats: SegmentStats[] = []

    for (const [key, times] of groups) {
        if (times.length < MIN_SAMPLES_FOR_STATS) continue

        const [fromStopId, toStopId, lineId] = key.split('|')
        const n = times.length
        const avg = times.reduce((a, b) => a + b, 0) / n
        const variance = times.reduce((a, t) => a + (t - avg) ** 2, 0) / n
        const stdDev = Math.sqrt(variance)

        stats.push({
            fromStopId: fromStopId!,
            toStopId: toStopId!,
            lineId: lineId!,
            avgSeconds: Math.round(avg),
            stdDevSeconds: Math.round(stdDev),
            sampleCount: n,
        })
    }

    return stats
}

function cleanup(): void {
    const cutoff = Date.now() - DATA_RETENTION_MS

    // Prune old segment records
    let writeIdx = 0
    for (let i = 0; i < segmentRecords.length; i++) {
        if (segmentRecords[i]!.recordedAt >= cutoff) {
            segmentRecords[writeIdx] = segmentRecords[i]!
            writeIdx++
        }
    }
    segmentRecords.length = writeIdx

    // Prune old observations
    for (const [key, obs] of latestObservations) {
        if (obs.recordedAt < cutoff) {
            latestObservations.delete(key)
        }
    }

    // Invalidate stats cache
    lastStatsComputation = 0
}
