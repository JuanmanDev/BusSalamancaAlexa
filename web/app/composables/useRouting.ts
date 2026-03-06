/**
 * Composable for client-side routing logic
 *
 * Uses TransitGraph singleton for persistent graph topology.
 * Implements Dijkstra + K-Shortest Paths (Iterative Penalty Method).
 * Integrates historical segment stats from server for accurate ETAs.
 *
 * Architecture:
 * - TransitGraph (singleton): Builds once, caches nodes/edges, applies historical weights
 * - useRouting (composable): Provides findRoutes() using the shared graph
 * - BinaryHeapPQ: O(n·log(n)) priority queue (replaces O(n²) array sort)
 */

import type { BusStop, BusLine, BusArrival, RouteOption, RouteSegment } from '~/types/bus'
import type { GraphEdge, ArrivalMap, RoutingConfig, SegmentStats, RouteConfidence } from '~/types/routing'
import { DEFAULT_ROUTING_CONFIG } from '~/types/routing'
import { getTransitGraph, BinaryHeapPQ } from '~/utils/TransitGraph'
import { haversineDistance } from '~/utils/geo'

export function useRouting() {
    const { fetchStops, fetchLines, fetchArrivals } = useBusService()
    const graph = getTransitGraph()
    const config = DEFAULT_ROUTING_CONFIG

    // --- Graph Lifecycle ---

    /**
     * Ensure graph is built. Idempotent — only builds on first call.
     */
    async function ensureGraph(): Promise<void> {
        if (graph.isBuilt) return

        const [stops, lines] = await Promise.all([
            fetchStops(),
            fetchLines(),
        ])

        graph.build(stops, lines, config)

        // Fetch and apply historical stats (non-blocking enhancement)
        try {
            const response = await $fetch<{ stats: SegmentStats[] }>('/api/bus/arrival-stats')
            if (response?.stats?.length > 0) {
                graph.applyHistoricalStats(response.stats)
            }
        } catch (e) {
            console.warn('[Routing] Could not load historical stats, using default weights')
        }
    }

    /**
     * Find K shortest paths using Dijkstra + penalty method
     */
    async function findRoutes(
        origin: { lat: number; lng: number; name?: string },
        destination: { lat: number; lng: number; name?: string },
        departureTime: Date = new Date()
    ): Promise<RouteOption[]> {

        await ensureGraph()

        const startId = 'ORIGIN'
        const endId = 'DESTINATION'

        // --- Virtual edges for origin/destination ---
        const localEdges = new Map<string, GraphEdge[]>()

        // Connect Origin → nearby stops
        const startNeighbors: GraphEdge[] = []
        const allNodes = graph.getAllNodes()

        for (const [, stop] of allNodes) {
            const d = haversineDistance(origin.lat, origin.lng, stop.lat, stop.lng)
            if (d < config.maxWalkDistance) {
                startNeighbors.push({
                    from: startId,
                    to: stop.id,
                    weight: d / config.walkingSpeedMps,
                    type: 'walk',
                    distance: d,
                })
            }
        }

        // Direct walk origin → destination
        const directDist = haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng)
        if (directDist < config.maxDirectWalkDistance) {
            startNeighbors.push({
                from: startId,
                to: endId,
                weight: directDist / config.walkingSpeedMps,
                type: 'walk',
                distance: directDist,
            })
        }

        localEdges.set(startId, startNeighbors)

        // Connect stops → Destination
        for (const [, stop] of allNodes) {
            const d = haversineDistance(stop.lat, stop.lng, destination.lat, destination.lng)
            if (d < config.maxWalkDistance) {
                const edge: GraphEdge = {
                    from: stop.id, to: endId,
                    weight: d / config.walkingSpeedMps,
                    type: 'walk', distance: d,
                }
                if (!localEdges.has(stop.id)) localEdges.set(stop.id, [])
                localEdges.get(stop.id)!.push(edge)
            }
        }

        // --- Fetch real-time arrivals for nearby stops ---
        const arrivalCache: ArrivalMap = new Map()

        const stopsToQuery = startNeighbors
            .filter(e => e.to !== endId)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 8) // Expanded from 5 to 8 for better coverage

        await Promise.all(stopsToQuery.map(async (edge) => {
            try {
                const arr = await fetchArrivals(edge.to)
                const map = new Map<string, number>()

                arr.forEach((a: BusArrival) => {
                    const ts = a.expectedArrivalTime ? new Date(a.expectedArrivalTime).getTime() : 0
                    if (ts > 0 && (!map.has(a.lineId) || ts < map.get(a.lineId)!)) {
                        map.set(a.lineId, ts)
                    }
                })
                arrivalCache.set(edge.to, map)
            } catch (_e) { /* ignore */ }
        }))

        // --- Neighbor lookup combining graph + local edges ---
        const getNeighbors = (id: string): GraphEdge[] => {
            const graphEdges = graph.getNeighbors(id)
            const local = localEdges.get(id) || []
            return [...graphEdges, ...local]
        }

        // --- K-Shortest Paths ---
        const K = config.kPaths
        const foundPaths: DijkstraResult[] = []
        const penalizedEdges = new Map<string, number>()

        for (let k = 0; k < K; k++) {
            const pathData = dijkstra(
                startId, endId,
                getNeighbors, penalizedEdges,
                departureTime.getTime(), arrivalCache, config
            )

            if (!pathData) break

            // Uniqueness check
            const pathKey = pathData.path.map(e => `${e.from}|${e.to}`).join(',')
            const isDuplicate = foundPaths.some(p =>
                p.path.map(e => `${e.from}|${e.to}`).join(',') === pathKey
            )

            if (!isDuplicate) {
                foundPaths.push(pathData)
            } else {
                k-- // Retry
                pathData.path.forEach(edge => {
                    const key = `${edge.from}|${edge.to}`
                    penalizedEdges.set(key, (penalizedEdges.get(key) || 0) + 5000)
                })
                if (k < -5) break // Safety valve
                continue
            }

            // Standard penalty for next iteration
            pathData.path.forEach(edge => {
                if (edge.type === 'bus') {
                    const key = `${edge.from}|${edge.to}`
                    penalizedEdges.set(key, (penalizedEdges.get(key) || 0) + (edge.weight * 2))
                }
            })
        }

        // --- Run one explicitly minimizing walking (preferBus) ---
        const preferBusPath = dijkstra(
            startId, endId,
            getNeighbors, new Map(),
            departureTime.getTime(), arrivalCache, config, true
        )
        if (preferBusPath) {
            const pathKey = preferBusPath.path.map(e => `${e.from}|${e.to}`).join(',')
            const isDuplicate = foundPaths.some(p =>
                p.path.map(e => `${e.from}|${e.to}`).join(',') === pathKey
            )
            if (!isDuplicate) {
                foundPaths.push(preferBusPath)
            }
        }

        // Determine confidence level
        const hasRealTimeData = arrivalCache.size > 0
        const hasHistoricalData = graph.getTotalObservations() > 0

        return foundPaths.map((p, i) =>
            convertToRouteOption(p, departureTime, origin, destination, i, hasRealTimeData, hasHistoricalData)
        )
    }

    return {
        ensureGraph,
        findRoutes,
    }
}

// --- Dijkstra ---

interface DijkstraResult {
    path: GraphEdge[]
    cost: number
    arrivalTime: number
}

function dijkstra(
    startId: string,
    endId: string,
    getNeighbors: (id: string) => GraphEdge[],
    penalties: Map<string, number>,
    startTimeMs: number,
    arrivals: ArrivalMap,
    config: RoutingConfig,
    preferBus: boolean = false
): DijkstraResult | null {

    const dist = new Map<string, number>()
    const prev = new Map<string, { edge: GraphEdge; from: string; arrivalTime: number }>()

    const pq = new BinaryHeapPQ<{ id: string; cost: number; time: number }>(
        (a, b) => a.cost - b.cost
    )

    dist.set(startId, 0)
    pq.enqueue({ id: startId, cost: 0, time: startTimeMs })

    while (!pq.isEmpty()) {
        const { id, cost, time: currentTime } = pq.dequeue()!

        if (cost > (dist.get(id) ?? Infinity)) continue

        if (id === endId) {
            // Reconstruct path
            const path: GraphEdge[] = []
            let curr = endId

            while (curr !== startId) {
                const rec = prev.get(curr)
                if (!rec) return null
                path.unshift(rec.edge)
                curr = rec.from
            }
            return { path, cost, arrivalTime: currentTime }
        }

        for (const edge of getNeighbors(id)) {
            let edgeDuration = edge.weight // seconds
            let waitTime = 0
            let boardingPenalty = 0

            // Check if continuing on the same bus line
            const lastRecord = prev.get(id)
            const prevLineId = lastRecord?.edge?.lineId
            const isContinuingLine = lastRecord && lastRecord.edge.type === 'bus' && prevLineId === edge.lineId

            if (edge.type === 'bus') {
                if (isContinuingLine) {
                    // Already on the bus — no wait
                    waitTime = 0
                    boardingPenalty = 0
                } else {
                    // Transfer or new line — check schedule
                    boardingPenalty = config.boardingPenaltySeconds

                    const stopArrivals = arrivals.get(edge.from)
                    const nextArrivalTs = stopArrivals?.get(edge.lineId || '')

                    if (nextArrivalTs !== undefined) {
                        if (nextArrivalTs > currentTime) {
                            waitTime = (nextArrivalTs - currentTime) / 1000
                        } else {
                            // Known arrival has passed — assume average frequency
                            waitTime = 15 * 60
                        }
                    } else {
                        // No real-time data — use defaults
                        const isFirstLeg = !lastRecord || lastRecord.edge.type === 'walk'
                        const isTransfer = lastRecord && lastRecord.edge.type === 'bus'

                        if (isFirstLeg) waitTime = config.initialWaitSeconds
                        else if (isTransfer) waitTime = config.transferPenaltySeconds
                    }
                }
            }

            // Artificial cost adjustments
            let artificialEdgeDuration = edgeDuration
            if (edge.type === 'walk') {
                if (preferBus) {
                    artificialEdgeDuration *= 5 // 5x walk cost
                }
                const isFirstLeg = !lastRecord || lastRecord.edge.from === startId
                const isLastLeg = edge.to === endId
                if (lastRecord && lastRecord.edge.type === 'walk' && !isFirstLeg && !isLastLeg) {
                    artificialEdgeDuration += 600 // 10 min penalty for multiple walks in the middle
                }
                if (preferBus && waitTime > config.initialWaitSeconds) {
                    // If we prefer bus, wait time also shouldn't block us from taking the bus over walking
                    // but we want waitTime intact, we just don't multiply it.
                }
            } else if (edge.type === 'bus' && preferBus) {
                // Ignore large wait times to prefer bus anyway
                waitTime = waitTime * 0.2
            }

            const penalty = penalties.get(`${edge.from}|${edge.to}`) || 0

            // COST: includes artificial penalties
            const totalEdgeCost = artificialEdgeDuration + waitTime + penalty + boardingPenalty

            // TIME: real elapsed time
            const totalEdgeTime = edgeDuration + waitTime

            const newCost = cost + totalEdgeCost
            const newTime = currentTime + (totalEdgeTime * 1000)

            if (newCost < (dist.get(edge.to) ?? Infinity)) {
                dist.set(edge.to, newCost)
                prev.set(edge.to, { edge, from: id, arrivalTime: newTime })
                pq.enqueue({ id: edge.to, cost: newCost, time: newTime })
            }
        }
    }

    return null
}

// --- Route Conversion ---

function convertToRouteOption(
    pathData: DijkstraResult,
    startTime: Date,
    origin: { lat: number; lng: number; name?: string },
    dest: { lat: number; lng: number; name?: string },
    index: number,
    hasRealTimeData: boolean,
    hasHistoricalData: boolean,
): RouteOption {
    const graph = getTransitGraph()
    const { path, arrivalTime } = pathData
    const segments: RouteSegment[] = []
    let currentSeg: RouteSegment | null = null

    path.forEach(edge => {
        const getNode = (id: string, fallback: { lat: number; lng: number; name?: string }) => {
            if (id === 'ORIGIN' || id === 'DESTINATION') return fallback
            const n = graph.getNode(id)
            return n ? { lat: n.lat, lng: n.lng, name: n.name } : fallback
        }

        const fromNode = getNode(edge.from, origin)
        const toNode = getNode(edge.to, dest)

        if (currentSeg && currentSeg.type === 'bus' && edge.type === 'bus' && currentSeg.lineId === edge.lineId) {
            // Merge consecutive bus edges on same line
            currentSeg.to = { id: edge.to, name: toNode.name || 'Stop', location: { lat: toNode.lat, lng: toNode.lng } }
            currentSeg.duration += edge.weight / 60
            currentSeg.distance += edge.distance
            currentSeg.geometry?.push({ lat: toNode.lat, lng: toNode.lng })
        } else {
            if (currentSeg) segments.push(currentSeg)

            // Use i18n-ready instruction keys instead of hardcoded Spanish
            const instructions = edge.type === 'walk'
                ? 'route.instruction_walk'
                : `route.instruction_bus`

            currentSeg = {
                type: edge.type as any,
                from: { id: edge.from, name: fromNode.name || 'Origin', location: { lat: fromNode.lat, lng: fromNode.lng } },
                to: { id: edge.to, name: toNode.name || 'Destination', location: { lat: toNode.lat, lng: toNode.lng } },
                duration: edge.weight / 60,
                distance: edge.distance,
                lineId: edge.lineId,
                instructions,
                geometry: [
                    { lat: fromNode.lat, lng: fromNode.lng },
                    { lat: toNode.lat, lng: toNode.lng },
                ],
            }
        }
    })
    if (currentSeg) segments.push(currentSeg)

    const totalDurationMinutes = (arrivalTime - startTime.getTime()) / 1000 / 60

    // Determine confidence based on data quality
    let confidence: RouteConfidence = 'low'
    if (hasRealTimeData && hasHistoricalData) confidence = 'high'
    else if (hasRealTimeData || hasHistoricalData) confidence = 'medium'

    const tags: string[] = []
    if (totalDurationMinutes < 20) tags.push('fast')

    return {
        id: `route-${index}-${Date.now()}`,
        segments,
        totalDuration: Math.max(1, Math.ceil(totalDurationMinutes)),
        walkingDistance: Math.round(segments.filter(s => s.type === 'walk').reduce((a, b) => a + b.distance, 0)),
        transfers: Math.max(0, segments.filter(s => s.type === 'bus').length - 1),
        departureTime: startTime,
        arrivalTime: new Date(arrivalTime),
        tags,
        confidence,
        historicalBasis: getTransitGraph().getTotalObservations(),
    }
}
