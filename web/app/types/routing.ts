/**
 * Types for the routing engine
 * Extracted from useRouting.ts for reusability and clean architecture (SRP)
 */

// --- Graph Types ---

export interface GraphNode {
    id: string
    lat: number
    lng: number
    name: string
    lines: string[]
}

export interface GraphEdge {
    from: string
    to: string
    weight: number       // Travel duration in seconds (base or historical)
    type: 'walk' | 'bus' | 'wait'
    lineId?: string
    distance: number     // Meters (haversine)
}

// Map of [StopID] -> [LineID] -> NextArrivalTimestamp (ms)
export type ArrivalMap = Map<string, Map<string, number>>

// --- Routing Config ---

export interface RoutingConfig {
    walkingSpeedMps: number       // ~4 km/h
    busSpeedMps: number           // Fallback when no historical data
    maxWalkDistance: number        // Max walk for transfers/start/end (meters)
    transferPenaltySeconds: number
    initialWaitSeconds: number
    boardingPenaltySeconds: number
    maxDirectWalkDistance: number  // Max walk for direct origin→dest (meters)
    kPaths: number                // Number of alternative routes
}

export const DEFAULT_ROUTING_CONFIG: RoutingConfig = {
    walkingSpeedMps: 1.1,
    busSpeedMps: 5.5,
    maxWalkDistance: 800,
    transferPenaltySeconds: 300,
    initialWaitSeconds: 300,
    boardingPenaltySeconds: 300,
    maxDirectWalkDistance: 3000,
    kPaths: 3,
}

// --- Historical Stats ---

export interface SegmentStats {
    fromStopId: string
    toStopId: string
    lineId: string
    avgSeconds: number
    stdDevSeconds: number
    sampleCount: number
}

// Route confidence based on data quality
export type RouteConfidence = 'high' | 'medium' | 'low'
