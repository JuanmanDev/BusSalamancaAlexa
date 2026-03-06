/**
 * TransitGraph — Persistent singleton graph for the bus transit network
 *
 * Builds once from stops/lines data, caches in Vue state (SSR-safe via useState).
 * Contains the binary heap PriorityQueue for O(n·log(n)) Dijkstra.
 *
 * Design Principles:
 * - Single Responsibility: Only manages the graph topology and lookups
 * - Open/Closed: Edge weights can be overridden via historicalWeights without modifying the graph
 * - DRY: One graph instance shared across all useRouting() calls
 */

import type { BusStop, BusLine } from '~/types/bus'
import type { GraphNode, GraphEdge, SegmentStats, RoutingConfig } from '~/types/routing'
import { DEFAULT_ROUTING_CONFIG } from '~/types/routing'
import { haversineDistance } from '~/utils/geo'

// --- Binary Heap PriorityQueue ---

export class BinaryHeapPQ<T> {
    private heap: T[] = []
    private compareFn: (a: T, b: T) => number

    constructor(compare: (a: T, b: T) => number) {
        this.compareFn = compare
    }

    get size(): number { return this.heap.length }
    isEmpty(): boolean { return this.heap.length === 0 }

    enqueue(item: T): void {
        this.heap.push(item)
        this._bubbleUp(this.heap.length - 1)
    }

    dequeue(): T | undefined {
        if (this.heap.length === 0) return undefined
        const top = this.heap[0]
        const last = this.heap.pop()!
        if (this.heap.length > 0) {
            this.heap[0] = last
            this._sinkDown(0)
        }
        return top
    }

    private _bubbleUp(idx: number): void {
        while (idx > 0) {
            const parentIdx = (idx - 1) >> 1
            if (this.compareFn(this.heap[idx]!, this.heap[parentIdx]!) < 0) {
                [this.heap[idx]!, this.heap[parentIdx]!] = [this.heap[parentIdx]!, this.heap[idx]!]
                idx = parentIdx
            } else {
                break
            }
        }
    }

    private _sinkDown(idx: number): void {
        const length = this.heap.length
        while (true) {
            let smallest = idx
            const left = 2 * idx + 1
            const right = 2 * idx + 2

            if (left < length && this.compareFn(this.heap[left]!, this.heap[smallest]!) < 0) {
                smallest = left
            }
            if (right < length && this.compareFn(this.heap[right]!, this.heap[smallest]!) < 0) {
                smallest = right
            }
            if (smallest !== idx) {
                [this.heap[idx]!, this.heap[smallest]!] = [this.heap[smallest]!, this.heap[idx]!]
                idx = smallest
            } else {
                break
            }
        }
    }
}

// --- TransitGraph ---

export class TransitGraph {
    private nodes: Map<string, GraphNode> = new Map()
    private adjacency: Map<string, GraphEdge[]> = new Map()
    private segmentStats: Map<string, SegmentStats> = new Map()
    private _isBuilt = false

    get isBuilt(): boolean { return this._isBuilt }
    get nodeCount(): number { return this.nodes.size }
    get edgeCount(): number {
        let count = 0
        for (const edges of this.adjacency.values()) count += edges.length
        return count
    }

    getNode(id: string): GraphNode | undefined {
        return this.nodes.get(id)
    }

    getNeighbors(id: string): GraphEdge[] {
        return this.adjacency.get(id) || []
    }

    getAllNodes(): Map<string, GraphNode> {
        return this.nodes
    }

    /**
     * Build the directed transit graph from stops and lines data
     */
    build(stops: BusStop[], lines: BusLine[], config: RoutingConfig = DEFAULT_ROUTING_CONFIG): void {
        if (this._isBuilt) return

        const nodes = new Map<string, GraphNode>()
        const adjacency = new Map<string, GraphEdge[]>()

        // 1. Create Nodes from stops
        for (const stop of stops) {
            if (stop.latitude && stop.longitude) {
                nodes.set(stop.id, {
                    id: stop.id,
                    lat: stop.latitude,
                    lng: stop.longitude,
                    name: stop.name,
                    lines: stop.lines || [],
                })
                adjacency.set(stop.id, [])
            }
        }

        // 2. Create Bus Edges from line direction definitions
        for (const line of lines) {
            if (!line.directions) continue

            for (const direction of line.directions) {
                const routeStops = direction.stops
                for (let i = 0; i < routeStops.length - 1; i++) {
                    const fromStop = routeStops[i]
                    const toStop = routeStops[i + 1]
                    if (!fromStop || !toStop) continue

                    const fromNode = nodes.get(fromStop.id)
                    const toNode = nodes.get(toStop.id)
                    if (!fromNode || !toNode) continue

                    const dist = haversineDistance(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng)
                    const duration = Math.max(30, dist / config.busSpeedMps) // Min 30s per segment

                    adjacency.get(fromStop.id)?.push({
                        from: fromStop.id,
                        to: toStop.id,
                        weight: duration,
                        type: 'bus',
                        lineId: line.id,
                        distance: dist,
                    })
                }
            }
        }

        // 3. Create Walking Transfer edges
        const TRANSFER_WALK_DISTANCE = 300 // meters — tight for transfers
        const nodeArray = Array.from(nodes.values())

        for (let i = 0; i < nodeArray.length; i++) {
            for (let j = i + 1; j < nodeArray.length; j++) {
                const n1 = nodeArray[i]!
                const n2 = nodeArray[j]!

                const dist = haversineDistance(n1.lat, n1.lng, n2.lat, n2.lng)

                if (dist < TRANSFER_WALK_DISTANCE) {
                    const walkTime = dist / config.walkingSpeedMps

                    adjacency.get(n1.id)?.push({
                        from: n1.id, to: n2.id,
                        weight: walkTime, type: 'walk', distance: dist,
                    })
                    adjacency.get(n2.id)?.push({
                        from: n2.id, to: n1.id,
                        weight: walkTime, type: 'walk', distance: dist,
                    })
                }
            }
        }

        this.nodes = nodes
        this.adjacency = adjacency
        this._isBuilt = true

        console.log(`[TransitGraph] Built. Nodes: ${nodes.size}, Edges: ${this.edgeCount}`)
    }

    /**
     * Reset the graph (e.g., on data refresh)
     */
    reset(): void {
        this.nodes.clear()
        this.adjacency.clear()
        this.segmentStats.clear()
        this._isBuilt = false
    }

    /**
     * Apply historical segment statistics to improve edge weights
     */
    applyHistoricalStats(stats: SegmentStats[]): void {
        this.segmentStats.clear()
        for (const stat of stats) {
            const key = `${stat.fromStopId}|${stat.toStopId}|${stat.lineId}`
            this.segmentStats.set(key, stat)
        }

        // Update edge weights based on historical averages
        for (const [_nodeId, edges] of this.adjacency) {
            for (const edge of edges) {
                if (edge.type !== 'bus' || !edge.lineId) continue

                const stat = this.segmentStats.get(`${edge.from}|${edge.to}|${edge.lineId}`)
                if (stat && stat.sampleCount >= 3) {
                    // Override haversine-based estimate with historical average
                    edge.weight = stat.avgSeconds
                }
            }
        }

        console.log(`[TransitGraph] Applied ${stats.length} historical stats`)
    }

    /**
     * Get historical stats for a specific segment
     */
    getSegmentStats(fromStopId: string, toStopId: string, lineId: string): SegmentStats | undefined {
        return this.segmentStats.get(`${fromStopId}|${toStopId}|${lineId}`)
    }

    /**
     * Get total historical observations count
     */
    getTotalObservations(): number {
        let total = 0
        for (const stat of this.segmentStats.values()) {
            total += stat.sampleCount
        }
        return total
    }
}

// --- Singleton accessor (SSR-safe) ---

let _instance: TransitGraph | null = null

export function getTransitGraph(): TransitGraph {
    if (!_instance) {
        _instance = new TransitGraph()
    }
    return _instance
}
