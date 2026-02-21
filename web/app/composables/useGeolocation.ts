/**
 * Composable for geolocation and distance calculations
 */

import type { BusStop } from '~/types/bus'

export function useGeolocation() {
    const userLocation = useState<{ lat: number; lng: number } | null>('userLocation', () => null)
    const isLocating = ref(false)
    const locationError = ref<string | null>(null)
    const permissionDenied = ref(false)

    async function requestLocation(options?: PositionOptions): Promise<boolean> {
        if (import.meta.server) return false

        isLocating.value = true
        locationError.value = null

        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                locationError.value = 'Geolocation is not supported by your browser'
                isLocating.value = false
                resolve(false)
                return
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLocation.value = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    }
                    isLocating.value = false
                    resolve(true)
                },
                (error) => {
                    isLocating.value = false
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            locationError.value = 'Permission denied'
                            permissionDenied.value = true
                            break
                        case error.POSITION_UNAVAILABLE:
                            locationError.value = 'Position unavailable'
                            break
                        case error.TIMEOUT:
                            locationError.value = 'Request timeout'
                            break
                    }
                    resolve(false)
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 30000,
                    ...options
                }
            )
        })
    }

    function watchLocation() {
        if (import.meta.server) return

        if (!navigator.geolocation) return

        navigator.geolocation.watchPosition(
            (position) => {
                userLocation.value = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                }
            },
            () => { },
            {
                enableHighAccuracy: true,
                maximumAge: 10000,
            }
        )
    }

    // Haversine formula for distance calculation
    function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371 // Earth's radius in km
        const dLat = toRad(lat2 - lat1)
        const dLon = toRad(lon2 - lon1)
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
    }

    function toRad(deg: number): number {
        return deg * (Math.PI / 180)
    }

    function getDistanceToStop(stop: BusStop): number | null {
        if (!userLocation.value || !stop.latitude || !stop.longitude) return null
        return calculateDistance(
            userLocation.value.lat,
            userLocation.value.lng,
            stop.latitude,
            stop.longitude
        )
    }

    function formatDistance(km: number): string {
        if (km < 1) {
            return `${Math.round(km * 1000)} m`
        }
        return `${km.toFixed(1)} km`
    }

    function getNearbyStops(stops: BusStop[], maxDistance: number = 1): BusStop[] {
        if (!userLocation.value) return []

        return stops
            .filter(stop => {
                const distance = getDistanceToStop(stop)
                return distance !== null && distance <= maxDistance
            })
            .sort((a, b) => {
                const distA = getDistanceToStop(a) || Infinity
                const distB = getDistanceToStop(b) || Infinity
                return distA - distB
            })
    }

    return {
        userLocation,
        isLocating,
        locationError,
        permissionDenied,
        requestLocation,
        watchLocation,
        calculateDistance,
        getDistanceToStop,
        formatDistance,
        getNearbyStops,
    }
}
