/**
 * Pinia store for global map state management
 * Controls the background map in the default layout
 * 
 * Context-based architecture: Pages call context setters (e.g., setContextToStopPage)
 * and the store manages all map logic, data fetching, and refresh intervals internally.
 */

import type { BusStop, BusVehicle, BusArrival, RouteOption } from '~/types/bus'

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

    forceAnimations: boolean

    // Routing
    routeOptions: RouteOption[]
    isRouting: boolean
    routeOrigin: { id: string; name: string; type: 'user' | 'stop' | 'address' | 'map'; lat?: number; lng?: number } | null
    routeDestination: { id: string; name: string; type: 'user' | 'stop' | 'address' | 'map'; lat?: number; lng?: number } | null
}

export type PositionEventType = 'stop' | 'line' | 'multi-stop' | 'user' | 'manual' | 'vehicle'

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
    const previousArrivals = ref<BusArrival[]>([])
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
    const forceAnimations = ref(true)

    // Selected vehicle for following (UI state)
    const selectedVehicle = ref<BusVehicle | null>(null)

    // Routing
    const routeOptions = ref<RouteOption[]>([])
    const isRouting = ref(false)
    const routeOrigin = ref<{ id: string; name: string; type: 'user' | 'stop' | 'address' | 'map'; lat?: number; lng?: number } | null>(null)
    const routeDestination = ref<{ id: string; name: string; type: 'user' | 'stop' | 'address' | 'map'; lat?: number; lng?: number } | null>(null)

    // Selected Route (for visualization)
    const selectedRoute = ref<RouteOption | null>(null)

    // Custom Line Paths (e.g. for Line Detail visualization)
    const linesToDraw = ref<{ id: string; color: string; points: { lat: number; lng: number }[]; width?: number; opacity?: number }[]>([])

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
        previousArrivals.value = []
        arrivalsLoading.value = false
        arrivalsError.value = null
        highlightStopId.value = null
        highlightLineId.value = null
        highlightVehicleId.value = null
        selectedVehicle.value = null
        linesToDraw.value = [] // Clear lines

        // Clear Route Data
        selectedRoute.value = null
        routeOptions.value = []
        routeOrigin.value = null
        routeDestination.value = null

        currentContext.value = null
        currentContextId.value = null
        // Do NOT clear routeOrigin/Destination here so they persist (Wait, user said "borra la información de la ruta que se vaya a realziar")
        // So I should clear them.

        isFullscreen.value = false
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

        let paddingValue = { top: 20, bottom: 20, left: 20, right: 20 };
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

    function setLines(lines: { id: string; color: string; points: { lat: number; lng: number }[]; width?: number; opacity?: number }[]) {
        linesToDraw.value = lines
    }

    function vehicleClick(vehicle: BusVehicle) {
        console.log('vehicleClick', vehicle);

        // Ensure fullscreen if not already
        // if (!isFullscreen.value) {
        //     // setFullscreen(true);
        //     isFullscreen.value = true
        //     isInteractive.value = true
        //     showControls.value = true
        // }

        highlightVehicleId.value = vehicle.id
        highlightStopId.value = null
        selectedVehicle.value = vehicle


        positionEvent.value = {
            id: Date.now(),
            points: [{ lng: vehicle.longitude, lat: vehicle.latitude }],
            zoom: 16,
            padding: padding.value,
            type: 'vehicle'
        }
        setFullscreen(true);

        // updatePositionWithMapPreviewContainer(positionEvent.value.points, { ...positionEvent.value, padding: padding.value, type: 'manual' })

        // Fly to vehicle with zoom
        if (mapInstance.value && vehicle.latitude && vehicle.longitude) {
            return;
            mapInstance.value.easeTo({
                center: [vehicle.longitude, vehicle.latitude],
                zoom: 16,
                duration: 2000,

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
                    duration: 2000
                })
            }
        }
    }

    async function calculateRoutes(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
        isRouting.value = true
        routeOptions.value = []
        selectedRoute.value = null

        try {
            const { findRoutes } = useRouting()
            const routes = await findRoutes(from, to)
            routeOptions.value = routes

            if (routes.length > 0) {
                selectRoute(routes[0]!)
            }
        } catch (e) {
            console.error('Error calculating routes:', e)
        } finally {
            isRouting.value = false
        }
    }

    function clearRoutes() {
        routeOptions.value = []
        selectedRoute.value = null
        highlightLineId.value = null
        linesToDraw.value = []
        // Reset view? Optional.
    }

    function selectRoute(route: RouteOption) {
        selectedRoute.value = route
        highlightLineId.value = null
        highlightStopId.value = null
        selectedVehicle.value = null

        // Collect all points to fit bounds
        const points: { lat: number; lng: number }[] = []
        route.segments.forEach(seg => {
            if (seg.geometry) {
                points.push(...seg.geometry)
            } else {
                points.push(seg.from.location, seg.to.location)
            }
        })

        updatePositionWithMapPreviewContainer(
            points.map(p => ({ lng: p.lng, lat: p.lat })),
            { type: 'line', padding: 50 }
        )
    }

    function focusOnLine(lineId: string, lineStops: BusStop[]) {
        console.log('focusOnLine', lineId, lineStops);
        const stopsWithCoords = lineStops.filter(s => s.latitude && s.longitude)
        highlightLineId.value = lineId
        highlightStopId.value = null
        // Do NOT filter stops.value here to allow translucency (stops.value is already set to allStops)

        if (stopsWithCoords.length > 0) {
            updatePositionWithMapPreviewContainer(
                stopsWithCoords.map(s => ({ lng: s.longitude!, lat: s.latitude! })),
                { type: 'line' }
            )
        }
    }

    function showAllStops(allStopsData: BusStop[]) {
        console.log('showAllStops', allStopsData.length);
        stops.value = allStopsData
        allStops.value = allStopsData
        highlightStopId.value = null
        highlightLineId.value = null
        linesToDraw.value = []

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
        linesToDraw.value = []
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

            if (currentContext.value === 'home') {
                paddingValue = { top: 0, bottom: 0, left: 0, right: 0 };
            } else {
                // set the top padding to the height of the appheader
                pagePadding.value.top = 64;
                // Bottom is 50vh - top
                const windowHeight = window.innerHeight / 2;
                pagePadding.value.bottom = windowHeight - 64 + 20;
                pagePadding.value.left = 20;
                pagePadding.value.right = 20;

                return;
            }
            // get the position of the mapPreviewContainer relative to the parent
            const rect = mapPreviewContainer.getBoundingClientRect()
            const windowHeight = window.innerHeight

            // paddings
            const topPadding = rect.top + window.scrollY;
            const bottomPadding = windowHeight - rect.bottom;
            console.log('windowHeight', windowHeight, 'rect.bottom', rect.bottom);

            if (topPadding < 0) return;
            if (bottomPadding < 0) return;

            pagePadding.value = {
                top: topPadding,
                bottom: bottomPadding,
                left: 20,
                right: 20
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

        const closeStops = geolocation.getNearbyStops(allStopsData, 2000).slice(0, 15)

        const points = [{
            lng: geolocation.userLocation.value.lng,
            lat: geolocation.userLocation.value.lat
        }]

        closeStops.forEach(stop => {
            if (stop.longitude && stop.latitude) {
                points.push({ lng: stop.longitude, lat: stop.latitude })
            }
        })

        // await new Promise(resolve => setTimeout(resolve, 1000))
        await new Promise(resolve => setTimeout(resolve, 10))

        stops.value = allStopsData

        updatePositionWithMapPreviewContainer(points, {
            zoom: 9,
        })
    }

    async function setContextToStopPage(stopId: string) {
        console.log('[MapStore] setContextToStopPage', stopId)
        if (currentContext.value !== 'stop' || currentContextId.value !== stopId) {
            clearContext()
            currentContext.value = 'stop'
            currentContextId.value = stopId
        }

        //setPagePaddingFromMapPreviewContainer()

        const busService = useBusService()

        // Load stop info
        const allStopsData = await busService.fetchStops()
        stops.value = allStopsData // Keep ALL stops

        const stopInfo = allStopsData.find(s => s.id === stopId)

        if (stopInfo) {
            highlightStopId.value = stopInfo.id
            focusOnStop(stopInfo)
        }

        // Fetch arrivals and extract vehicles
        await fetchArrivalsForStop(stopId)


        clearRefreshInterval();
        // Start auto-refresh
        refreshInterval = setInterval(() => {
            if (currentContext.value === 'stop' && currentContextId.value === stopId) {
                fetchArrivalsForStop(stopId)
            }
        }, 10000)
    }

    async function fetchArrivalsForStop(stopId: string) {
        const busService = useBusService()

        // Store previous arrivals before fetching new ones
        if (arrivals.value.length > 0) {
            previousArrivals.value = [...arrivals.value]
        }

        try {
            arrivalsLoading.value = arrivals.value.length === 0
            arrivalsError.value = null

            const fetchedArrivals = await busService.fetchArrivals(stopId)

            // Smart merging logic
            let finalArrivals = [...fetchedArrivals]

            if (previousArrivals.value.length > 0) {
                const now = new Date()
                const lastUpdate = lastUpdated.value || now
                const elapsedMinutes = (now.getTime() - lastUpdate.getTime()) / 60000

                // Check for missing buses that should still be there
                previousArrivals.value.forEach(prev => {
                    // Only consider if it had enough time remaining (> 2 mins)
                    // If it was < 2 mins, it might have just arrived/passed
                    if (prev.minutesRemaining > 2) {
                        const isStillPresent = finalArrivals.some(curr =>
                            curr.lineId === prev.lineId &&
                            // Match by vehicleRef if available, or roughly by time (tolerance 2 mins)
                            (curr.vehicleRef === prev.vehicleRef ||
                                Math.abs(curr.expectedArrivalTime.getTime() - prev.expectedArrivalTime.getTime()) < 120000)
                        )

                        if (!isStillPresent) {
                            // Bus disappeared but should be here -> add as estimate
                            const adjustedMinutes = Math.max(0, Math.round(prev.minutesRemaining - elapsedMinutes))

                            // Only add if it still hasn't "arrived" (min > 0)
                            if (adjustedMinutes > 0) {
                                finalArrivals.push({
                                    ...prev,
                                    minutesRemaining: adjustedMinutes,
                                    isEstimate: true
                                })
                            }
                        }
                    }
                })
            }

            // Sort by time
            finalArrivals.sort((a, b) => a.minutesRemaining - b.minutesRemaining)

            arrivals.value = finalArrivals

            // Extract vehicles from arrivals
            const arrivalVehicles = finalArrivals
                .filter(a => a.location && a.vehicleRef && !a.isEstimate)
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
            console.error('Error fetching arrivals:', e)

            // On error, try to use previous arrivals as estimates
            if (previousArrivals.value.length > 0) {
                const now = new Date()
                const lastUpdate = lastUpdated.value || now
                const elapsedMinutes = (now.getTime() - lastUpdate.getTime()) / 60000

                const estimatedArrivals = previousArrivals.value.map(prev => {
                    const adjustedMinutes = Math.max(0, Math.round(prev.minutesRemaining - elapsedMinutes))
                    return {
                        ...prev,
                        minutesRemaining: adjustedMinutes,
                        isEstimate: true
                    }
                }).filter(a => a.minutesRemaining > 0)

                if (estimatedArrivals.length > 0) {
                    arrivals.value = estimatedArrivals
                    // Note: We don't update vehicles here to avoid showing stale positions
                } else {
                    arrivalsError.value = 'Error al cargar llegadas'
                }
            } else {
                arrivalsError.value = 'Error al cargar llegadas'
            }
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

        await nextTick();

        const busService = useBusService()

        // Load all stops
        const allStopsData = await busService.fetchStops()
        stops.value = allStopsData // Keep ALL stops for translucency

        // Filter for bounds calculation only
        const lineStops = allStopsData
            .filter(s => s.lines?.includes(lineId))
            .sort((a, b) => parseInt(a.id) - parseInt(b.id))

        if (lineStops.length > 0) {
            focusOnLine(lineId, lineStops)
        }

        // Fetch vehicles (All of them, let BaseMap handle dimming)
        // We still prioritize the line vehicles for "Real-time" accuracy if we use the arrival fallback
        // But the user wants to see others.
        // Let's fetch ALL vehicles globally.
        updateVehiclesInternal(busService, lineId, lineStops)

        // Start auto-refresh
        refreshInterval = setInterval(() => {
            if (currentContext.value === 'line' && currentContextId.value === lineId) {
                updateVehiclesInternal(busService, lineId, lineStops)
            }
        }, 10000)
    }

    async function updateVehiclesInternal(busService: any, lineId?: string, lineStops?: BusStop[]) {
        try {
            const globalData = await busService.fetchVehicles()
            let finalVehicles = globalData

            // Only update if we get data, or if we have no data yet. 
            if (globalData.length > 0) {
                // Good, we have data.
            } else if (vehicles.value.length > 0) {
                console.warn('[MapStore] Received 0 vehicles, keeping stale data to prevent flickering')
                finalVehicles = vehicles.value // Keep stale
            } else {
                finalVehicles = []
            }

            // Fallback: If we are in a specific line context, ENABLE FALLBACK via arrivals if the line is missing
            if (lineId && lineStops && lineStops.length > 0) {
                const lineVehicles = finalVehicles.filter((v: BusVehicle) => v.lineId === lineId)

                if (lineVehicles.length === 0) {
                    console.log('[MapStore] No vehicles found for line', lineId, 'in global feed. Trying fallback...')
                    // Try to fetch via arrivals
                    const fallbackVehicles = await fetchVehiclesFallback(lineId, lineStops, busService)

                    if (fallbackVehicles.length > 0) {
                        console.log('[MapStore] Found', fallbackVehicles.length, 'vehicles via fallback')
                        // Merge: Keep all global vehicles (that involve OTHER lines) + our fallback vehicles
                        // Filter out any potential duplicates by ID just in case
                        const existingIds = new Set(finalVehicles.map((v: BusVehicle) => v.id))

                        fallbackVehicles.forEach(v => {
                            if (!existingIds.has(v.id)) {
                                finalVehicles.push(v)
                            }
                        })
                    }
                }
            }

            vehicles.value = finalVehicles

        } catch (e) {
            console.error(e)
            // Keep stale data on error
        }
    }

    async function updateVehiclesGlobal(busService: any) {
        return updateVehiclesInternal(busService)
    }

    // Helper for fallback
    async function fetchVehiclesFallback(lineId: string, lineStops: BusStop[], busService: any): Promise<BusVehicle[]> {
        try {
            const stopsToCheck: BusStop[] = []
            // Check every 8th stop to be efficient but cover the line
            const step = Math.max(1, Math.floor(lineStops.length / 8))

            for (let i = 0; i < lineStops.length; i += step) {
                stopsToCheck.push(lineStops[i]!)
            }
            // Always check last stop
            if (lineStops.length > 0) {
                stopsToCheck.push(lineStops[lineStops.length - 1]!)
            }

            const promises = stopsToCheck.map(s => busService.fetchArrivals(s.id))
            const results = await Promise.all(promises)

            const derivedVehicles = new Map<string, BusVehicle>()

            results.flat().forEach((arrival: BusArrival) => {
                if (arrival.lineId === lineId && arrival.vehicleRef && arrival.location) {
                    derivedVehicles.set(arrival.vehicleRef, {
                        id: arrival.vehicleRef,
                        lineId: arrival.lineId,
                        lineName: arrival.lineName,
                        latitude: arrival.location.latitude,
                        longitude: arrival.location.longitude,
                        destination: arrival.destination,
                        bearing: 0 // Unknown in fallback
                    })
                }
            })

            return Array.from(derivedVehicles.values())
        } catch (e) {
            console.error('Fallback fetch failed', e)
            return []
        }
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


    function setContextToRoutePage() {
        console.log('[MapStore] setContextToRoutePage')
        const previousContext = currentContext.value
        clearContext()
        currentContext.value = 'route'

        // We do NOT want fullscreen for the route planning page itself
        // It should look like the home page (map background + overlay)
        setFullscreen(false)
        isInteractive.value = false

        // Only reset camera if coming from a non-map page to avoid jarring jumps
        // But since we want to show the map background, maybe we should Ensure we have a valid view?
        if (previousContext !== 'home' && previousContext !== 'map') {
            updatePosition([{ lng: -5.6635, lat: 40.9701 }], { zoom: 14, type: 'manual' })
        }
    }

    function setRouteOrigin(location: typeof routeOrigin.value) {
        routeOrigin.value = location
    }

    function setRouteDestination(location: typeof routeDestination.value) {
        routeDestination.value = location
    }

    function swapRoutePoints() {
        const temp = routeOrigin.value
        routeOrigin.value = routeDestination.value
        routeDestination.value = temp
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
        routeOrigin,
        routeDestination,
        isInteractive,
        isFullscreen,
        showControls,
        padding,
        mapInstance,
        positionEvent,
        currentContext,
        currentContextId,
        forceAnimations,
        routeOptions,
        isRouting,

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
        vehicleClick,
        updateFollowedVehicle,
        selectedVehicle,
        selectedRoute,
        selectRoute,
        calculateRoutes,
        clearRoutes,
        linesToDraw,
        setLines,

        // Context Handlers
        setContextToHomePage,
        setContextToStopPage,
        setContextToLinePage,
        setContextToMapPage,
        setContextToStopsListPage,
        setContextToLinesListPage,
        setContextToRoutePage,
        setRouteOrigin,
        setRouteDestination,
        swapRoutePoints,
        clearContext,
    }
})
