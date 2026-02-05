/**
 * Pinia store for global map state management
 * Controls the background map in the default layout
 * 
 * Context-based architecture: Pages call context setters (e.g., setContextToStopPage)
 * and the store manages all map logic, data fetching, and refresh intervals internally.
 */

import type { BusStop, BusVehicle, BusArrival } from '~/types/bus'

export interface MapState {
    // Map position
    center: [number, number] // [lng, lat]
    zoom: number

    // Data to display
    stops: BusStop[]
    vehicles: BusVehicle[]

    // Highlighting
    highlightStopId: string | null
    highlightLineId: string | null
    highlightVehicleId: string | null

    // Interactivity
    isInteractive: boolean
    isFullscreen: boolean
    showControls: boolean
    padding: { top: number; bottom: number; left: number; right: number }
    pagePadding: { top: number; bottom: number; left: number; right: number }

    // Instance (optional/internal)
    mapInstance?: any
}

export type PositionEventType = 'stop' | 'line' | 'multi-stop' | 'user' | 'manual'

export interface MapPositionEvent {
    id: number
    type: PositionEventType
    points: { lat: number; lng: number }[]
    zoom?: number
    padding?: { top: number; bottom: number; left: number; right: number }
}

// Context types
export type MapContext = 'home' | 'stop' | 'line' | 'map' | 'stops-list' | 'lines-list'

export const useMapStore = defineStore('map', () => {
    // Default center: Salamanca Plaza Mayor
    const center = ref<[number, number]>([-5.6635, 40.9701])
    const zoom = ref(14)
    const padding = ref({ top: 0, bottom: 0, left: 0, right: 0 })
    const pagePadding = ref({ top: 0, bottom: 0, left: 0, right: 0 })

    const stops = ref<BusStop[]>([])
    const allStops = ref<BusStop[]>([]) // Preserve full stops list for restoration
    const vehicles = ref<BusVehicle[]>([])

    // Arrivals for stop context (exposed for stop page to read)
    const arrivals = ref<BusArrival[]>([])
    const arrivalsLoading = ref(false)
    const arrivalsError = ref<string | null>(null)
    const lastUpdated = ref<Date | null>(null)

    // Event triggered positioning
    const positionEvent = ref<MapPositionEvent | null>(null)

    const highlightStopId = ref<string | null>(null)
    const highlightLineId = ref<string | null>(null)
    const highlightVehicleId = ref<string | null>(null)

    const isInteractive = ref(false)
    const isFullscreen = ref(false)
    const showControls = ref(false)

    // Selected vehicle for following (UI state)
    const selectedVehicle = ref<BusVehicle | null>(null)

    // Map instance
    const mapInstance = shallowRef<any | null>(null)

    // ===== Context Management =====
    const currentContext = ref<MapContext | null>(null)
    const currentContextId = ref<string | null>(null)
    let refreshInterval: ReturnType<typeof setInterval> | null = null

    // ===== Internal Helpers =====

    function clearRefreshInterval() {
        if (refreshInterval) {
            clearInterval(refreshInterval)
            refreshInterval = null
        }
    }

    function clearContext() {
        console.log('[MapStore] Clearing context:', currentContext.value)
        clearRefreshInterval()

        // Reset state
        vehicles.value = []
        arrivals.value = []
        arrivalsLoading.value = false
        arrivalsError.value = null
        highlightStopId.value = null
        highlightLineId.value = null
        highlightVehicleId.value = null
        selectedVehicle.value = null

        currentContext.value = null
        currentContextId.value = null
    }

    // ===== Position Actions =====

    function updatePosition(points: { lat: number; lng: number }[], options: { zoom?: number, padding?: any, type?: PositionEventType } = {}) {
        console.log('updatePosition', points, options);
        positionEvent.value = {
            id: Date.now(),
            type: options.type || 'manual',
            points,
            zoom: options.zoom,
            padding: options.padding
        }
    }

    function updatePositionWithMapPreviewContainer(points: { lat: number; lng: number }[], options: { zoom?: number, padding?: any, type?: PositionEventType } = {}) {
        console.log('updatePositionWithMapPreviewContainer', points, options);

        let paddingValue = { top: 0, bottom: 0, left: 0, right: 0 };
        if (!isFullscreen.value) {
            paddingValue = pagePadding.value
        }

        console.log('updatePositionWithMapPreviewContainer padding', paddingValue);

        positionEvent.value = {
            id: Date.now(),
            type: options.type || 'manual',
            points,
            zoom: options.zoom,
            padding: paddingValue
        }
    }

    function setMapState(state: Partial<MapState>) {
        if (state.stops) {
            stops.value = state.stops;
            console.log('setMapState stops', state.stops.length);
        }
        if (state.vehicles) vehicles.value = state.vehicles
        if (state.highlightStopId !== undefined) highlightStopId.value = state.highlightStopId
        if (state.highlightLineId !== undefined) highlightLineId.value = state.highlightLineId
        if (state.highlightVehicleId !== undefined) highlightVehicleId.value = state.highlightVehicleId
        if (state.isInteractive !== undefined) isInteractive.value = state.isInteractive
        if (state.isFullscreen !== undefined) isFullscreen.value = state.isFullscreen
        if (state.showControls !== undefined) showControls.value = state.showControls
        if (state.padding) padding.value = state.padding
        if (state.pagePadding) pagePadding.value = state.pagePadding

        // Legacy compatibility - try to map to event
        if (state.center) {
            updatePosition([{ lng: state.center[0], lat: state.center[1] }], {
                zoom: state.zoom,
                padding: state.padding,
                type: 'manual'
            })
        }
    }

    function focusOnStop(stop: BusStop) {
        if (stop.longitude && stop.latitude) {
            highlightStopId.value = stop.id
            highlightLineId.value = null
            // Don't replace stops - just highlight the selected one
            // Stops array should remain as-is so other stops stay visible
            updatePositionWithMapPreviewContainer([{ lng: stop.longitude, lat: stop.latitude }], {
                zoom: 15,
                type: 'stop',
            })
            console.log('focusOnStop', stop);
        }
    }

    function clearHighlight() {
        highlightStopId.value = null
        highlightLineId.value = null
        highlightVehicleId.value = null
        selectedVehicle.value = null
    }

    function followVehicle(vehicle: BusVehicle) {
        console.log('followVehicle', vehicle);
        highlightVehicleId.value = vehicle.id
        highlightStopId.value = null
        selectedVehicle.value = vehicle

        // Fly to vehicle with zoom
        if (mapInstance.value && vehicle.latitude && vehicle.longitude) {
            mapInstance.value.flyTo({
                center: [vehicle.longitude, vehicle.latitude],
                zoom: 16,
                duration: 1500
            })
        }
    }

    // Update vehicle position when following
    function updateFollowedVehicle(vehiclesList: BusVehicle[]) {
        if (!selectedVehicle.value) return

        const updated = vehiclesList.find(v => v.id === selectedVehicle.value?.id)
        if (updated) {
            selectedVehicle.value = updated
            // Smooth pan to new position
            if (mapInstance.value && !mapInstance.value.isMoving()) {
                mapInstance.value.easeTo({
                    center: [updated.longitude, updated.latitude],
                    duration: 1000
                })
            }
        }
    }

    function focusOnLine(lineId: string, lineStops: BusStop[]) {
        console.log('focusOnLine', lineId, lineStops);
        const stopsWithCoords = lineStops.filter(s => s.latitude && s.longitude)
        if (stopsWithCoords.length > 0) {
            updatePositionWithMapPreviewContainer(
                stopsWithCoords.map(s => ({ lng: s.longitude!, lat: s.latitude! })),
                { type: 'line' }
            )
        }
        highlightLineId.value = lineId
        highlightStopId.value = null
        stops.value = lineStops
    }

    function showAllStops(allStopsData: BusStop[]) {
        console.log('showAllStops', allStopsData.length);
        stops.value = allStopsData
        allStops.value = allStopsData
        highlightStopId.value = null
        highlightLineId.value = null

        // Reset view to Salamanca default
        updatePosition([{ lng: -5.6635, lat: 40.9701 }], { zoom: 14, type: 'manual' })
    }

    function setFullscreen(value: boolean) {
        isFullscreen.value = value
        isInteractive.value = value
        showControls.value = value

        // Retrigger last position event to adjust layout (padding) if needed
        if (positionEvent.value) {
            updatePositionWithMapPreviewContainer(positionEvent.value.points, { ...positionEvent.value, padding: padding.value, type: 'manual' })
        }
    }

    function reset() {
        console.log('reset map');
        updatePosition([{ lng: -5.6635, lat: 40.9701 }], { zoom: 14, type: 'manual' })
        stops.value = []
        vehicles.value = []
        arrivals.value = []
        highlightStopId.value = null
        highlightLineId.value = null
        highlightVehicleId.value = null
        isInteractive.value = false
        isFullscreen.value = false
        showControls.value = false
        padding.value = { top: 0, bottom: 0, left: 0, right: 0 }
        pagePadding.value = { top: 0, bottom: 0, left: 0, right: 0 }
    }

    // Deprecated direct fitBounds - prefer updatePosition with multiple points
    function fitBounds(bounds: [number, number, number, number], paddingOptions?: number | { top: number; bottom: number; left: number; right: number }) {
        if (mapInstance.value) {
            // We can convert bounds to points loosely for compatibility or just proxy
            mapInstance.value.fitBounds(bounds, {
                padding: paddingOptions ?? 50,
                duration: 2000
            })
        }
    }

    function setPagePadding(paddingValue: { top: number; bottom: number; left: number; right: number }) {
        pagePadding.value = paddingValue
    }

    function setPagePaddingFromMapPreviewContainer() {
        const mapPreviewContainer = document.getElementById('mapPreviewContainer')

        let paddingValue = { top: 0, bottom: 0, left: 0, right: 0 };
        if (!isFullscreen.value && mapPreviewContainer) {
            const rect = mapPreviewContainer.getBoundingClientRect()
            const windowHeight = window.innerHeight

            // paddings
            const topPadding = rect.top
            const bottomPadding = windowHeight - rect.bottom

            pagePadding.value = {
                top: topPadding,
                bottom: bottomPadding,
                left: 0,
                right: 0
            }
        }
    }

    // ===== Context Handlers =====

    /**
     * Home page context: Show all stops, handle user location + nearby stops
     */
    async function setContextToHomePage() {
        console.log('[MapStore] setContextToHomePage')
        clearContext()
        currentContext.value = 'home'

        setPagePaddingFromMapPreviewContainer()

        const busService = useBusService()
        const geolocation = useGeolocation()

        // Load all stops
        const allStopsData = await busService.fetchStops()
        showAllStops(allStopsData)

        // Try to get user location and update map
        if (geolocation.userLocation.value) {
            await updateMapToUserLocation(allStopsData, geolocation)
        } else if (!geolocation.permissionDenied.value) {
            const success = await geolocation.requestLocation()
            if (success) {
                await updateMapToUserLocation(allStopsData, geolocation)
            }
        }
    }

    async function updateMapToUserLocation(allStopsData: BusStop[], geolocation: ReturnType<typeof useGeolocation>) {
        if (!geolocation.userLocation.value) return

        const closeStops = geolocation.getNearbyStops(allStopsData, 2000).slice(0, 5)

        const points = [{
            lng: geolocation.userLocation.value.lng,
            lat: geolocation.userLocation.value.lat
        }]

        closeStops.forEach(stop => {
            if (stop.longitude && stop.latitude) {
                points.push({ lng: stop.longitude, lat: stop.latitude })
            }
        })

        await new Promise(resolve => setTimeout(resolve, 1000))

        stops.value = allStopsData

        updatePositionWithMapPreviewContainer(points, {
            type: 'multi-stop'
        })
    }

    /**
     * Stop detail page context: Single stop view with arrivals and vehicles
     */
    async function setContextToStopPage(stopId: string) {
        console.log('[MapStore] setContextToStopPage', stopId)
        clearContext()
        currentContext.value = 'stop'
        currentContextId.value = stopId

        setPagePaddingFromMapPreviewContainer()

        const busService = useBusService()

        // Load stop info
        const allStopsData = await busService.fetchStops()
        const stopInfo = allStopsData.find(s => s.id === stopId)

        if (stopInfo) {
            stops.value = [stopInfo]
            highlightStopId.value = stopInfo.id
            focusOnStop(stopInfo)
        }

        // Fetch arrivals and extract vehicles
        await fetchArrivalsForStop(stopId)

        // Start auto-refresh
        refreshInterval = setInterval(() => {
            if (currentContext.value === 'stop' && currentContextId.value === stopId) {
                fetchArrivalsForStop(stopId)
            }
        }, 10000)
    }

    async function fetchArrivalsForStop(stopId: string) {
        const busService = useBusService()

        try {
            arrivalsLoading.value = arrivals.value.length === 0
            arrivalsError.value = null

            const fetchedArrivals = await busService.fetchArrivals(stopId)
            arrivals.value = fetchedArrivals

            // Extract vehicles from arrivals
            const arrivalVehicles = fetchedArrivals
                .filter(a => a.location && a.vehicleRef)
                .map(a => ({
                    id: a.vehicleRef!,
                    lineId: a.lineId,
                    lineName: a.lineName,
                    latitude: a.location!.latitude,
                    longitude: a.location!.longitude,
                    destination: a.destination
                }))

            vehicles.value = arrivalVehicles
            lastUpdated.value = new Date()
        } catch (e) {
            arrivalsError.value = 'Error al cargar llegadas'
            console.error(e)
        } finally {
            arrivalsLoading.value = false
        }
    }

    /**
     * Line detail page context: Show all stops on line, fetch vehicles
     */
    async function setContextToLinePage(lineId: string) {
        console.log('[MapStore] setContextToLinePage', lineId)
        clearContext()
        currentContext.value = 'line'
        currentContextId.value = lineId

        setPagePaddingFromMapPreviewContainer()

        const busService = useBusService()

        // Load all stops and filter by line
        const allStopsData = await busService.fetchStops()
        const lineStops = allStopsData
            .filter(s => s.lines?.includes(lineId))
            .sort((a, b) => parseInt(a.id) - parseInt(b.id))

        if (lineStops.length > 0) {
            focusOnLine(lineId, lineStops)
        }

        // Fetch vehicles for this line
        await fetchVehiclesForLine(lineId, lineStops, busService)

        // Start auto-refresh
        refreshInterval = setInterval(() => {
            if (currentContext.value === 'line' && currentContextId.value === lineId) {
                fetchVehiclesForLine(lineId, lineStops, busService)
            }
        }, 10000)
    }

    async function fetchVehiclesForLine(lineId: string, lineStops: BusStop[], busService: ReturnType<typeof useBusService>) {
        try {
            // First try global endpoint
            const globalData = await busService.fetchVehicles()
            const validGlobalVehicles = globalData.filter(v => v.lineId === lineId)

            if (validGlobalVehicles.length > 0) {
                vehicles.value = validGlobalVehicles
                return
            }

            // Fallback: Check arrivals for key stops
            if (lineStops.length > 0) {
                const stopsToCheck: BusStop[] = []
                const step = Math.max(1, Math.floor(lineStops.length / 5))

                for (let i = 0; i < lineStops.length; i += step) {
                    stopsToCheck.push(lineStops[i]!)
                }

                const lastStop = lineStops[lineStops.length - 1]
                if (lastStop && !stopsToCheck.includes(lastStop)) {
                    stopsToCheck.push(lastStop)
                }

                const promises = stopsToCheck.map(s => busService.fetchArrivals(s.id))
                const results = await Promise.all(promises)

                const derivedVehicles = new Map<string, BusVehicle>()

                results.flat().forEach(arrival => {
                    if (arrival.lineId === lineId && arrival.vehicleRef && arrival.location) {
                        derivedVehicles.set(arrival.vehicleRef, {
                            id: arrival.vehicleRef,
                            lineId: arrival.lineId,
                            lineName: arrival.lineName,
                            latitude: arrival.location.latitude,
                            longitude: arrival.location.longitude,
                            destination: arrival.destination
                        })
                    }
                })

                vehicles.value = Array.from(derivedVehicles.values())
            }
        } catch (e) {
            console.error('Error fetching vehicles for line:', e)
        }
    }

    /**
     * Full map page context: Interactive map with all stops and live vehicles
     */
    async function setContextToMapPage() {
        console.log('[MapStore] setContextToMapPage')
        clearContext()
        currentContext.value = 'map'

        const busService = useBusService()
        const geolocation = useGeolocation()

        // Set to full interactive mode
        setMapState({
            isInteractive: true,
            isFullscreen: true,
            showControls: true,
        })

        // Load all stops
        const allStopsData = await busService.fetchStops()
        stops.value = allStopsData

        // Request location
        geolocation.requestLocation()

        // Fetch vehicles
        await fetchAllVehicles(busService)

        // Start auto-refresh
        refreshInterval = setInterval(() => {
            if (currentContext.value === 'map') {
                fetchAllVehicles(busService)
            }
        }, 15000)
    }

    async function fetchAllVehicles(busService: ReturnType<typeof useBusService>) {
        try {
            const fetched = await busService.fetchVehicles()
            vehicles.value = fetched
            updateFollowedVehicle(fetched)
        } catch (e) {
            console.error('Error fetching vehicles:', e)
        }
    }

    /**
     * Stops list page context: Simple list, no map interaction
     */
    function setContextToStopsListPage() {
        console.log('[MapStore] setContextToStopsListPage')
        clearContext()
        currentContext.value = 'stops-list'
        setFullscreen(false)
    }

    /**
     * Lines list page context: Simple list, no map interaction
     */
    function setContextToLinesListPage() {
        console.log('[MapStore] setContextToLinesListPage')
        clearContext()
        currentContext.value = 'lines-list'
        setFullscreen(false)
    }

    return {
        // State
        center,
        zoom,
        stops,
        allStops,
        vehicles,
        arrivals,
        arrivalsLoading,
        arrivalsError,
        lastUpdated,
        highlightStopId,
        highlightLineId,
        highlightVehicleId,
        isInteractive,
        isFullscreen,
        showControls,
        padding,
        mapInstance,
        positionEvent,
        currentContext,
        currentContextId,

        // Actions
        setMapState,
        updatePosition,
        updatePositionWithMapPreviewContainer,
        focusOnStop,
        focusOnLine,
        showAllStops,
        setFullscreen,
        reset,
        fitBounds,
        setPagePadding,
        setPagePaddingFromMapPreviewContainer,
        clearHighlight,
        followVehicle,
        updateFollowedVehicle,
        selectedVehicle,

        // Context Handlers
        setContextToHomePage,
        setContextToStopPage,
        setContextToLinePage,
        setContextToMapPage,
        setContextToStopsListPage,
        setContextToLinesListPage,
        clearContext,
    }
})
