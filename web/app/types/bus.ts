/**
 * Types for Bus Salamanca SIRI data
 */

export interface BusLine {
    id: string
    name: string
    destination?: string
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
