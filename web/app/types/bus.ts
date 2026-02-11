/**
 * Types for Bus Salamanca SIRI data
 */

export interface BusLine {
    id: string
    name: string
    destination?: string
    directions?: {
        id: string
        name: string
        stops: { id: string; order: number }[]
    }[]
}

export interface BusStop {
    id: string
    name: string
    latitude?: number
    longitude?: number
    lines?: string[]
}

export interface BusArrival {
    lineId: string
    lineName: string
    destination: string
    expectedArrivalTime: Date
    aimedArrivalTime?: Date
    minutesRemaining: number
    vehicleRef?: string
    location?: {
        latitude: number
        longitude: number
    }
    isEstimate?: boolean
}

export interface BusVehicle {
    id: string
    lineId: string
    lineName?: string
    latitude: number
    longitude: number
    bearing?: number
    delay?: number
    destination?: string
}

export interface FavoriteItem {
    type: 'stop' | 'line'
    id: string
    name: string
    addedAt: number
}

export interface RecentItem {
    type: 'stop' | 'line'
    id: string
    name: string
    visitedAt: number
}

export interface RouteSegment {
    type: 'walk' | 'bus' | 'wait'
    from: { id: string; name: string; location: { lat: number; lng: number } }
    to: { id: string; name: string; location: { lat: number; lng: number } }
    duration: number // Minutes
    distance: number // Meters
    lineId?: string
    instructions: string
    geometry?: { lat: number; lng: number }[]
}

export interface RouteOption {
    id: string
    segments: RouteSegment[]
    totalDuration: number // Minutes
    walkingDistance: number // Meters
    transfers: number
    departureTime: Date
    arrivalTime: Date
    tags: string[]
}
