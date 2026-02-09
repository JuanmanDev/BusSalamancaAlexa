/**
 * Composable for client-side routing logic
 * Constructs a graph from stops and lines and calculates paths
 * Uses K-Shortest Paths (Iterative Penalty Method) to generate multiple options
 */

import type { BusStop, BusLine, BusArrival, RouteOption, RouteSegment } from '~/types/bus'

// --- Graph Types ---

interface Node {
    id: string
    lat: number
    lng: number
    name: string
    lines: string[]
}

interface Edge {
    from: string
    to: string
    weight: number // Base travel duration in seconds
    type: 'walk' | 'bus' | 'wait'
    lineId?: string
    distance: number // Meters
}

// Map of [StopID] -> [LineID] -> NextArrivalTimestamp (ms)
type ArrivalMap = Map<string, Map<string, number>>

export function useRouting() {
    const { fetchStops, fetchLines, fetchArrivals } = useBusService()

    // --- Config ---
    const WALKING_SPEED_MPS = 1.1 // ~4 km/h
    const BUS_SPEED_MPS = 5.5 // ~20 km/h average in city (including stops)
    const MAX_WALK_DISTANCE = 800 // meters for transfers/start/end
    const TRANSFER_PENALTY_SECONDS = 300 // 5 min penalty
    const INITIAL_WAIT_SECONDS = 300 // 5 mins avg wait

    // --- State ---
    const graphNodes = ref<Map<string, Node>>(new Map())
    const graphEdges = ref<Map<string, Edge[]>>(new Map())
    const isBuildingGraph = ref(false)
    const allStopsCache = ref<BusStop[]>([])

    // --- Helpers ---

    function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3 // metres
        const φ1 = lat1 * Math.PI / 180
        const φ2 = lat2 * Math.PI / 180
        const Δφ = (lat2 - lat1) * Math.PI / 180
        const Δλ = (lon2 - lon1) * Math.PI / 180

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

        return R * c
    }

    /**
     * Build the directed graph
     * Uses explicit line definitions from fetchLines() to determine connectivity
     */
    async function buildGraph() {
        if (isBuildingGraph.value || graphNodes.value.size > 0) return

        isBuildingGraph.value = true

        // Fetch data in parallel
        const [stops, lines] = await Promise.all([
            fetchStops(),
            fetchLines()
        ])

        allStopsCache.value = stops
        const nodes = new Map<string, Node>()
        const edges = new Map<string, Edge[]>()

        // 1. Create Nodes
        stops.forEach(stop => {
            if (stop.latitude && stop.longitude) {
                nodes.set(stop.id, {
                    id: stop.id,
                    lat: stop.latitude,
                    lng: stop.longitude,
                    name: stop.name,
                    lines: stop.lines || []
                })
                edges.set(stop.id, [])
            }
        })

        // 2. Create Bus Edges (Sequential based on Lines)
        lines.forEach(line => {
            if (!line.directions) return

            line.directions.forEach(direction => {
                const routeStops = direction.stops

                for (let i = 0; i < routeStops.length - 1; i++) {
                    const fromStop = routeStops[i]
                    const toStop = routeStops[i + 1]

                    if (!fromStop || !toStop) continue

                    const fromId = fromStop.id
                    const toId = toStop.id

                    const fromNode = nodes.get(fromId)
                    const toNode = nodes.get(toId)

                    if (!fromNode || !toNode) continue

                    const dist = getDistance(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng)
                    const duration = Math.max(30, dist / BUS_SPEED_MPS) // Min 30s per stop

                    if (!edges.has(fromId)) edges.set(fromId, [])

                    // Check if edge already exists for this line (avoid duplicates if multiple directions share logic? Usually distinct)
                    edges.get(fromId)?.push({
                        from: fromId,
                        to: toId,
                        weight: duration,
                        type: 'bus',
                        lineId: line.id,
                        distance: dist
                    })
                }
            })
        })

        // 3. Create Walking Transfers
        // Optimize: Use spatial indexing if large. For < 500 stops, O(N^2) is ~250k checks, likely < 50ms.
        const nodeArray = Array.from(nodes.values())

        for (let i = 0; i < nodeArray.length; i++) {
            for (let j = i + 1; j < nodeArray.length; j++) {
                const n1 = nodeArray[i]
                const n2 = nodeArray[j]

                const dist = getDistance(n1.lat, n1.lng, n2.lat, n2.lng)

                if (dist < 300) { // Valid transfer distance (tightened to 300m for transfers)
                    const walkTime = dist / WALKING_SPEED_MPS

                    edges.get(n1.id)?.push({ from: n1.id, to: n2.id, weight: walkTime, type: 'walk', distance: dist })
                    edges.get(n2.id)?.push({ from: n2.id, to: n1.id, weight: walkTime, type: 'walk', distance: dist })
                }
            }
        }

        graphNodes.value = nodes
        graphEdges.value = edges
        isBuildingGraph.value = false
        console.log('[Routing] Graph built. Nodes:', nodes.size)
    }

    /**
     * Find K shortest paths using simplistic penalty method
     * 1. Run Dijkstra -> Path 1
     * 2. "Penalize" edges used in Path 1 (increase weight)
     * 3. Run Dijkstra -> Path 2
     * 4. ... Repeat K times
     */
    async function findRoutes(
        origin: { lat: number; lng: number, name?: string },
        destination: { lat: number; lng: number, name?: string },
        departureTime: Date = new Date()
    ): Promise<RouteOption[]> {

        if (graphNodes.value.size === 0) {
            await buildGraph()
        }

        const startId = 'ORIGIN'
        const endId = 'DESTINATION'

        // Temporary Graph Extensions (Virtual Nodes/Edges)
        const localEdges = new Map<string, Edge[]>()

        // 1. Connect Origin -> Nearby Stops
        const startNeighbors: Edge[] = []
        const allStops = Array.from(graphNodes.value.values())

        // Find nearby stops to Origin
        allStops.forEach(stop => {
            const d = getDistance(origin.lat, origin.lng, stop.lat, stop.lng)
            if (d < MAX_WALK_DISTANCE) {
                startNeighbors.push({
                    from: startId,
                    to: stop.id,
                    weight: d / WALKING_SPEED_MPS,
                    type: 'walk',
                    distance: d
                })
            }
        })

        // Direct Walk (Start -> End)
        const directDist = getDistance(origin.lat, origin.lng, destination.lat, destination.lng)
        if (directDist < 3000) { // Allow direct walk up to 3km
            startNeighbors.push({
                from: startId,
                to: endId,
                weight: directDist / WALKING_SPEED_MPS,
                type: 'walk',
                distance: directDist
            })
        }

        localEdges.set(startId, startNeighbors)

        // 2. Connect Stops -> Destination
        // Since graph is directed A->B, and we can walk FROM any stop TO destination
        allStops.forEach(stop => {
            const d = getDistance(stop.lat, stop.lng, destination.lat, destination.lng)
            if (d < MAX_WALK_DISTANCE) {
                const walkTime = d / WALKING_SPEED_MPS
                const edge: Edge = { from: stop.id, to: endId, weight: walkTime, type: 'walk', distance: d }

                if (!localEdges.has(stop.id)) localEdges.set(stop.id, [])
                localEdges.get(stop.id)!.push(edge)
            }
        })

        // --- Arrival Times ---
        const arrivalCache: ArrivalMap = new Map()

        // Fetch arrivals for the closest stops to origin to get real-time start
        startNeighbors.sort((a, b) => a.distance - b.distance)
        const closestStops = startNeighbors.slice(0, 5) // Top 5 closest stops

        await Promise.all(closestStops.map(async (edge) => {
            if (edge.to === endId) return
            try {
                const arr = await fetchArrivals(edge.to)
                const map = new Map<string, number>()

                arr.forEach(a => {
                    // Use expectedArrivalTime if available
                    const ts = a.expectedArrivalTime ? new Date(a.expectedArrivalTime).getTime() : 0
                    if (ts > 0 && (!map.has(a.lineId) || ts < map.get(a.lineId)!)) {
                        map.set(a.lineId, ts)
                    }
                })
                arrivalCache.set(edge.to, map)
            } catch (e) { /* ignore */ }
        }))

        // --- Pathfinding ---
        const getNeighbors = (id: string): Edge[] => {
            const global = graphEdges.value.get(id) || []
            const local = localEdges.get(id) || []
            return [...global, ...local]
        }

        const K = 3
        const foundPaths: ReturnType<typeof dijkstra>[] = []
        const penalizedEdges = new Map<string, number>()

        for (let k = 0; k < K; k++) {
            const pathData = dijkstra(
                startId,
                endId,
                getNeighbors,
                penalizedEdges,
                departureTime.getTime(),
                arrivalCache
            )

            if (!pathData) break

            // Uniqueness check
            const pathKey = pathData.path.map(e => `${e.from}|${e.to}`).join(',')
            const isDuplicate = foundPaths.some(p => p && p.path.map(e => `${e.from}|${e.to}`).join(',') === pathKey)

            if (!isDuplicate) {
                foundPaths.push(pathData)
            } else {
                k--
                // Punish heavily to force deviation
                pathData.path.forEach(edge => {
                    const key = `${edge.from}|${edge.to}`
                    const cur = penalizedEdges.get(key) || 0
                    penalizedEdges.set(key, cur + 5000)
                })
                if (k < -5) break // safety
                continue
            }

            // Standard Penalty for next iteration
            pathData.path.forEach(edge => {
                if (edge.type === 'bus') {
                    const key = `${edge.from}|${edge.to}`
                    const cur = penalizedEdges.get(key) || 0
                    penalizedEdges.set(key, cur + (edge.weight * 2))
                }
            })
        }

        // Convert
        return foundPaths.map((p, i) => convertToRouteOption(p!, departureTime, origin, destination, i))
    }

    function dijkstra(
        startId: string,
        endId: string,
        getNeighbors: (id: string) => Edge[],
        penalties: Map<string, number>,
        startTimeMs: number,
        arrivals: ArrivalMap
    ) {
        const dist = new Map<string, number>()
        // prev stores how we got to a node: edge used, previous node, and arrival time at this node
        const prev = new Map<string, { edge: Edge, from: string, arrivalTime: number }>()
        const pq = new PriorityQueue<{ id: string, cost: number, time: number }>(
            (a, b) => a.cost - b.cost
        )

        dist.set(startId, 0)
        pq.enqueue({ id: startId, cost: 0, time: startTimeMs })

        while (!pq.isEmpty()) {
            const { id, cost, time: currentTime } = pq.dequeue()!

            if (cost > (dist.get(id) ?? Infinity)) continue
            if (id === endId) {
                const path: Edge[] = []
                let curr = endId
                while (curr !== startId) {
                    const rec = prev.get(curr)
                    if (!rec) return null
                    path.unshift(rec.edge)
                    curr = rec.from
                }
                return { path, cost }
            }

            for (const edge of getNeighbors(id)) {
                let edgeDuration = edge.weight // seconds
                let waitTime = 0

                // Get previous edge to check for same-line transfer
                const lastRecord = prev.get(id)
                const prevLineId = lastRecord?.edge?.lineId
                const isContinuingLine = lastRecord && lastRecord.edge.type === 'bus' && prevLineId === edge.lineId

                // Time Logic
                if (edge.type === 'bus') {
                    if (isContinuingLine) {
                        // Case 1: Already on the bus. No wait.
                        waitTime = 0
                    } else {
                        // Case 2: Transfer or New Line. Check Schedule.
                        const stopArrivals = arrivals.get(edge.from)
                        const nextArrivalTs = stopArrivals?.get(edge.lineId || '')

                        if (nextArrivalTs !== undefined) {
                            // Check if the known arrival is in the future relative to NOW (currentTime)
                            if (nextArrivalTs > currentTime) {
                                waitTime = (nextArrivalTs - currentTime) / 1000
                            } else {
                                // The known arrival has passed.
                                // Fallback: Assume we just missed it and have to wait 'Average Frequency' (e.g. 15 min)
                                waitTime = 15 * 60
                            }
                        } else {
                            // No real time data
                            const isTransfer = lastRecord && lastRecord.edge.type === 'bus'
                            const isFirstLeg = !lastRecord || lastRecord.edge.type === 'walk'
                            const isWalkToStop = lastRecord && lastRecord.edge.type === 'walk'

                            if (isFirstLeg || isWalkToStop) waitTime = INITIAL_WAIT_SECONDS // 5 min
                            else if (isTransfer) waitTime = TRANSFER_PENALTY_SECONDS // 5 min
                        }
                    }
                }

                const penalty = penalties.get(`${edge.from}|${edge.to}`) || 0
                const totalEdgeCost = edgeDuration + waitTime + penalty
                const newCost = cost + totalEdgeCost
                const newTime = currentTime + (edgeDuration * 1000) + (waitTime * 1000)

                if (newCost < (dist.get(edge.to) ?? Infinity)) {
                    dist.set(edge.to, newCost)
                    prev.set(edge.to, { edge, from: id, arrivalTime: newTime })
                    pq.enqueue({ id: edge.to, cost: newCost, time: newTime })
                }
            }
        }
        return null
    }

    function convertToRouteOption(
        pathData: { path: Edge[], cost: number },
        startTime: Date,
        origin: { lat: number, lng: number, name?: string },
        dest: { lat: number, lng: number, name?: string },
        index: number
    ): RouteOption {
        const { path, cost } = pathData
        const segments: RouteSegment[] = []
        let currentSeg: RouteSegment | null = null

        path.forEach(edge => {
            // Get node info safely
            const getNode = (id: string, fallback: { lat: number, lng: number, name?: string }) => {
                if (id === 'ORIGIN' || id === 'DESTINATION') return fallback
                const n = graphNodes.value.get(id)
                return n ? { lat: n.lat, lng: n.lng, name: n.name } : fallback
            }

            const fromNode = getNode(edge.from, origin)
            const toNode = getNode(edge.to, dest)

            if (currentSeg && currentSeg.type === 'bus' && edge.type === 'bus' && currentSeg.lineId === edge.lineId) {
                // Merge
                currentSeg.to = { id: edge.to, name: toNode.name || 'Parada', location: { lat: toNode.lat, lng: toNode.lng } }
                currentSeg.duration += edge.weight / 60
                currentSeg.distance += edge.distance
                currentSeg.geometry?.push({ lat: toNode.lat, lng: toNode.lng })
            } else {
                if (currentSeg) segments.push(currentSeg)

                currentSeg = {
                    type: edge.type as any,
                    from: { id: edge.from, name: fromNode.name || 'Origen', location: { lat: fromNode.lat, lng: fromNode.lng } },
                    to: { id: edge.to, name: toNode.name || 'Destino', location: { lat: toNode.lat, lng: toNode.lng } },
                    duration: edge.weight / 60,
                    distance: edge.distance,
                    lineId: edge.lineId,
                    instructions: edge.type === 'walk' ? 'Caminar' : `Autobús ${edge.lineId}`,
                    geometry: [
                        { lat: fromNode.lat, lng: fromNode.lng },
                        { lat: toNode.lat, lng: toNode.lng }
                    ]
                }
            }
        })
        if (currentSeg) segments.push(currentSeg)

        return {
            id: `route-${index}-${Date.now()}`,
            segments,
            totalDuration: Math.ceil(cost / 60),
            walkingDistance: Math.round(segments.filter(s => s.type === 'walk').reduce((a, b) => a + b.distance, 0)),
            transfers: Math.max(0, segments.filter(s => s.type === 'bus').length - 1),
            departureTime: startTime,
            arrivalTime: new Date(startTime.getTime() + cost * 1000),
            tags: cost < 1200 ? ['Rápido'] : []
        }
    }

    return {
        buildGraph,
        findRoutes,
        isBuildingGraph
    }
}

// Minimal Priority Queue
class PriorityQueue<T> {
    private items: T[] = []
    constructor(private compare: (a: T, b: T) => number) { }

    enqueue(item: T) {
        this.items.push(item)
        this.items.sort(this.compare)
    }

    dequeue(): T | undefined {
        return this.items.shift()
    }

    isEmpty() { return this.items.length === 0 }
}
