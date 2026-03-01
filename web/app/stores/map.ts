/**
 * Pinia store for global map state management
 * Controls the background map in the default layout
 * 
 * Context-based architecture: Pages call context setters (e.g., setContextToStopPage)
 * and the store manages all map logic, data fetching, and refresh intervals internally.
 */

import type { BusStop, BusVehicle, BusArrival, RouteOption, BusLine } from '~/types/bus'

// ===== Centralized Padding Configuration (12-Factor: Config) =====
// Single source of truth for all map padding values.
const MAP_PADDING = {
    /** Uniform padding on each border when in fullscreen mode */
    FULLSCREEN: 10,
    /** Extra margin so markers/points are not flush against the visible edge */
    EDGE_MARGIN: 20,
} as const

export interface MapState {
    // Map position
    center: [number, number] // [lng, lat]
    zoom: number
    rotation: number
    pitch: number

    // Data to display
    stops: BusStop[]
    vehicles: BusVehicle[]

    // Filtering & Visibility
    filterLineIds: string[]
    showStops: boolean
    showVehicles: boolean
    showRoutes: boolean

    // Highlighting
    highlightStopId: string | null
    highlightLineId: string | null
    highlightVehicleId: string | null

    // Interactivity
    isInteractive: boolean
    isFullscreen: boolean
    isExitingFullscreen: boolean
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

export type PositionEventType = 'stop' | 'line' | 'multi-stop' | 'user' | 'manual' | 'vehicle' | 'route'

export interface MapPositionEvent {
    id: number
    type: PositionEventType
    points: { lat: number; lng: number }[]
    zoom?: number
    bearing?: number
    pitch?: number
    padding?: { top: number; bottom: number; left: number; right: number }
}

// Context types
export type MapContext = 'home' | 'stop' | 'line' | 'map' | 'stops-list' | 'lines-list' | 'route'

export const useMapStore = defineStore('map', () => {
    // Default center: Salamanca Plaza Mayor
    const center = ref<[number, number]>([-5.6635, 40.9701])
    const zoom = ref(14)
    const rotation = ref(0)
    const pitch = ref(0)
    const padding = ref({ top: 0, bottom: 0, left: 0, right: 0 })
    const pagePadding = ref({ top: 0, bottom: 0, left: 0, right: 0 })

    const stops = ref<BusStop[]>([])
    const allStops = ref<BusStop[]>([]) // Preserve full stops list for restoration
    const rawVehicles = ref<BusVehicle[]>([]) // Unfiltered list of all vehicles
    const vehicles = ref<BusVehicle[]>([]) // Displayed vehicles (filtered by context)

    // Visibility State
    const filterLineIds = ref<string[]>([])
    const showStops = ref(true)
    const showVehicles = ref(true)
    const showRoutes = ref(true)

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

    // Geolocation logic
    const geolocation = useGeolocation()

    const showUserLocationButton = computed(() => {
        const userLoc = geolocation.userLocation.value
        if (!userLoc) return false

        // Calculate distance between user location and map center
        // mapStore.center is [lng, lat]
        const dist = geolocation.calculateDistance(
            userLoc.lat,
            userLoc.lng,
            center.value[1],
            center.value[0]
        )

        // Show only if distance is greater than 100 meters (0.1 km)
        return dist > 0.1
    })

    const isInteractive = ref(false)
    const isFullscreen = ref(false)
    const isExitingFullscreen = ref(false)
    const isTransitioning = ref(false) // True during MapPreview FLIP animation
    const showControls = ref(false)
    const forceAnimations = useLocalStorage('app-force-animations', true)

    // Track whether the current page has its own MapPreview component
    const hasPageMapPreview = ref(false)

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

    // Preloaded Geometries
    const preloadedLineGeometries = ref<Record<string, { id: string, color: string, points: { lat: number, lng: number }[] }[]> | null>(null)
    const geometriesCacheTime = ref<number>(0)

    // Manual localStorage sync to avoid VueUse serializer issues with complex nested objects/nulls
    const GEOMETRY_CACHE_KEY = 'bus-line-geometries-store-v10'
    const TIMESTAMP_CACHE_KEY = 'bus-line-geometries-time-v10'

    function loadFromLocalStorage() {
        if (typeof window === 'undefined') return false;
        try {
            const timeStr = localStorage.getItem(TIMESTAMP_CACHE_KEY)
            const geomStr = localStorage.getItem(GEOMETRY_CACHE_KEY)
            if (timeStr && geomStr) {
                const time = parseInt(timeStr, 10)
                const now = Date.now()
                const ONE_DAY = 24 * 60 * 60 * 1000
                if (now - time < ONE_DAY) {
                    preloadedLineGeometries.value = JSON.parse(geomStr)
                    geometriesCacheTime.value = time
                    return true
                }
            }
        } catch (e) {
            console.error('[MapStore] Error reading cache from localStorage', e)
        }
        return false
    }

    function saveToLocalStorage(data: any, time: number) {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(GEOMETRY_CACHE_KEY, JSON.stringify(data))
            localStorage.setItem(TIMESTAMP_CACHE_KEY, time.toString())
        } catch (e) {
            console.error('[MapStore] Error saving cache to localStorage', e)
        }
    }

    let lineGeometryPromises: Record<string, Promise<void>> = {}

    async function fetchLineGeometry(lineId: string) {
        if (preloadedLineGeometries.value && preloadedLineGeometries.value[lineId]) return;
        if (lineGeometryPromises[lineId]) return lineGeometryPromises[lineId];

        // Try to load from localStorage first if we just freshly opened the app
        if (!preloadedLineGeometries.value || Object.keys(preloadedLineGeometries.value).length === 0) {
            loadFromLocalStorage()
            if (preloadedLineGeometries.value && preloadedLineGeometries.value[lineId]) return;
        }

        lineGeometryPromises[lineId] = (async () => {
            try {
                console.log(`[MapStore] Fetching geometry for line ${lineId}...`)
                const data = await $fetch(`/api/bus/all-lines-geometry?lineId=${lineId}`)
                if (data && typeof data === 'object') {
                    // Merge new line data into the store
                    preloadedLineGeometries.value = {
                        ...preloadedLineGeometries.value,
                        ...data
                    }
                    saveToLocalStorage(preloadedLineGeometries.value, Date.now())
                    console.log(`[MapStore] Geometry for line ${lineId} loaded and cached.`)
                }
            } catch (e) {
                console.error(`Failed to load geometry for line ${lineId}:`, e)
            } finally {
                delete lineGeometryPromises[lineId]
            }
        })();

        return lineGeometryPromises[lineId];
    }

    // Map instance
    const mapInstance = shallowRef<any | null>(null)

    // ===== Context Management =====
    const currentContext = ref<MapContext | null>(null)
    const currentContextId = ref<string | null>(null)
    let refreshInterval: ReturnType<typeof setInterval> | null = null
    let vehicleInterval: ReturnType<typeof setInterval> | null = null

    // Track whether the general-view map animation has already played.
    // Prevents repeating the fly-to animation on every navigation between home/lines/stops.
    let generalViewPositioned = false

    // ===== Internal Helpers =====

    function clearRefreshInterval() {
        if (refreshInterval) {
            clearInterval(refreshInterval)
            refreshInterval = null
        }
    }

    function clearVehicleInterval() {
        if (vehicleInterval) {
            clearInterval(vehicleInterval)
            vehicleInterval = null
        }
    }

    function clearContext(keepVehicles = true) {
        console.log('[MapStore] Clearing context:', currentContext.value, 'keepVehicles:', keepVehicles)
        clearRefreshInterval()
        clearVehicleInterval()
        // Reset state
        if (!keepVehicles) {
            vehicles.value = []
            rawVehicles.value = [] // Also clear raw if we really want to clear
        }
        arrivals.value = []
        previousArrivals.value = []
        arrivalsLoading.value = false
        arrivalsError.value = null
        highlightStopId.value = null
        highlightLineId.value = null
        highlightVehicleId.value = null
        selectedVehicle.value = null
        linesToDraw.value = [] // Clear lines

        // Reset Visibility Defaults (optional, or keep persistence?)
        // For now, let's keep them persistent across contexts or reset if context changes?
        // User wants global map management. Let's keep them as is, or maybe reset on clear?
        // Usually, context switches imply reset.
        // But if I go from Map to Home, I might want to keep settings?
        // Let's reset filterLineIds only on full clear?
        // Actually, let's NOT reset visibility toggles here to persist them.

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
    let positionUpdateTimeout: ReturnType<typeof setTimeout> | null = null
    let lastPositionUpdateTime = 0

    function executePositionUpdate(payload: any) {
        positionEvent.value = payload
        lastPositionUpdateTime = Date.now()
    }

    /** Reset debounce so the next position update fires immediately. */
    function resetPositionDebounce() {
        if (positionUpdateTimeout) clearTimeout(positionUpdateTimeout)
        lastPositionUpdateTime = 0
    }

    function updatePosition(points: { lat: number; lng: number }[], options: { zoom?: number, bearing?: number, pitch?: number, padding?: any, type?: PositionEventType } = {}) {
        console.log('updatePosition', points, options);
        const payload = {
            id: Date.now(),
            type: options.type || 'manual',
            points,
            zoom: options.zoom,
            bearing: options.bearing,
            pitch: options.pitch,
            padding: options.padding
        }

        const now = Date.now()
        if (now - lastPositionUpdateTime < 800) {
            if (positionUpdateTimeout) clearTimeout(positionUpdateTimeout)
            positionUpdateTimeout = setTimeout(() => executePositionUpdate(payload), 800 - (now - lastPositionUpdateTime))
        } else {
            executePositionUpdate(payload)
        }
    }

    async function updatePositionWithMapPreviewContainer(points: { lat: number; lng: number }[], options: { zoom?: number, padding?: any, type?: PositionEventType } = {}) {
        console.log('updatePositionWithMapPreviewContainer', points, options);

        await nextTick(); // Wait for any DOM changes to settle (like exiting fullscreen) before reading rect
        setPagePaddingFromMapPreviewContainer();

        // options.padding is passed through as-is to the position event.
        // The final padding calculation (base + margin + extra) is done by getEffectivePadding()
        // when consumed in BaseMap.vue, so we don't add any buffers here.
        const payload = {
            id: Date.now(),
            type: options.type || 'manual',
            points,
            zoom: options.zoom,
            padding: options.padding
        }

        const now = Date.now()
        if (now - lastPositionUpdateTime < 800) {
            // Last-wins: cancel pending update and schedule the newest one
            if (positionUpdateTimeout) {
                clearTimeout(positionUpdateTimeout)
                console.log('updatePositionWithMapPreviewContainer cleared timeout');
            }
            positionUpdateTimeout = setTimeout(() => executePositionUpdate(payload), 100)
        } else {
            executePositionUpdate(payload)
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
        if (state.rotation !== undefined) rotation.value = state.rotation
        if (state.pitch !== undefined) pitch.value = state.pitch

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
            highlightVehicleId.value = null
            selectedVehicle.value = null

            // Always clear line highlight when focusing on a single stop.
            // The stop takes full visual priority (SRP).
            highlightLineId.value = null
            linesToDraw.value = []

            // Don't replace stops - just highlight the selected one
            // Stops array should remain as-is so other stops stay visible
            updatePositionWithMapPreviewContainer([{ lng: stop.longitude, lat: stop.latitude }], {
                zoom: 16, // Slightly closer
                type: 'stop',
            })
            console.log('focusOnStop', stop);
        }
    }

    function clearHighlight() {
        highlightStopId.value = null
        highlightVehicleId.value = null
        selectedVehicle.value = null

        // If we are in line context, restore line highlight
        if (currentContext.value === 'line' && currentContextId.value) {
            highlightLineId.value = currentContextId.value
        } else {
            highlightLineId.value = null
        }
    }

    function setLines(lines: { id: string; color: string; points: { lat: number; lng: number }[]; width?: number; opacity?: number }[]) {
        linesToDraw.value = lines
    }

    function vehicleClick(vehicle: BusVehicle) {
        console.log('vehicleClick', vehicle);

        highlightVehicleId.value = vehicle.id
        highlightStopId.value = null
        selectedVehicle.value = vehicle


        positionEvent.value = {
            id: Date.now(),
            points: [{ lng: vehicle.longitude, lat: vehicle.latitude }],
            zoom: 16,
            // No explicit padding — getEffectivePadding() handles it
            type: 'vehicle'
        }
        if (currentContext.value !== 'route') {
            setFullscreen(true);
        }

    }

    // Update vehicle position when following
    function updateFollowedVehicle(vehiclesList: BusVehicle[]) {
        if (!selectedVehicle.value) return

        const updated = vehiclesList.find(v => v.id === selectedVehicle.value?.id)
        if (updated) {
            // Update the reference
            selectedVehicle.value = updated
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

    function setFullscreen(value: boolean, skipPositionUpdate = false) {
        isFullscreen.value = value
        isInteractive.value = value
        showControls.value = value

        // Only re-trigger position when ENTERING fullscreen (to adjust padding).
        // Exiting defers to the destination page's context setter.
        // Skipped when the caller handles positioning itself (e.g., focusOnStop).
        if (value && !skipPositionUpdate && positionEvent.value) {
            updatePositionWithMapPreviewContainer(positionEvent.value.points, { ...positionEvent.value, type: 'manual' })
        }
    }

    function reset() {
        console.log('reset map');
        updatePosition([{ lng: -5.6635, lat: 40.9701 }], { zoom: 14, type: 'manual' })
        stops.value = []
        allStops.value = []
        vehicles.value = []
        rotation.value = 0
        pitch.value = 0
        rawVehicles.value = []
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

        positionEvent.value = null

        // Reset visibility
        filterLineIds.value = []
        showStops.value = true
        showVehicles.value = true
        showRoutes.value = true

        clearRefreshInterval()
        clearVehicleInterval()
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
        if (typeof document === 'undefined') return // SSR guard

        if (isFullscreen.value) {
            pagePadding.value = { top: 0, bottom: 0, left: 0, right: 0 }
            return
        }

        // Use the explicitly registered element, or fallback to query if none
        const mapPreviewContainer = activeMapPreviewElement.value || document.getElementById('mapPreviewContainer')
        if (mapPreviewContainer) {
            const rect = mapPreviewContainer.getBoundingClientRect()
            const clientWidth = document.documentElement.clientWidth
            const windowHeight = window.innerHeight

            console.log('[MapStore] setPagePaddingFromMapPreviewContainer', {
                source: activeMapPreviewElement.value ? 'registered' : 'getElementById',
                rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height },
                clientWidth,
                windowHeight
            })

            // Prevent invalid calculations if element is hidden/mid-transition
            if (rect.width === 0 && rect.height === 0) {
                console.log('[MapStore] Skipping zero-size element')
                pagePadding.value = { top: 0, bottom: 0, left: 0, right: 0 }
                return;
            }

            // Padding is the area of the screen OUTSIDE the MapPreview container.
            // mapRef is fixed inset-0, so it covers the whole screen.
            const topPadding = Math.max(0, rect.top);
            const bottomPadding = Math.max(0, windowHeight - rect.bottom);
            const leftPadding = Math.max(0, rect.left);
            const rightPadding = Math.max(0, clientWidth - rect.right); // clientWidth avoids scrollbar math bugs!

            // Store raw distances only — edge margin is applied by getEffectivePadding()
            pagePadding.value = {
                top: topPadding,
                bottom: bottomPadding,
                left: leftPadding,
                right: rightPadding
            }
        } else {
            pagePadding.value = { top: 0, bottom: 0, left: 0, right: 0 }
        }
    }

    /**
     * Single source of truth for final map padding.
     * Combines fullscreen state, pagePadding (container measurement), edge margin, and optional extra padding.
     */
    function getEffectivePadding(extraPadding?: { top?: number; bottom?: number; left?: number; right?: number } | number): { top: number; bottom: number; left: number; right: number } {
        if (isFullscreen.value) {
            const fs = MAP_PADDING.FULLSCREEN
            console.log('getEffectivePadding fullscreen', fs)
            return { top: fs, bottom: fs, left: fs, right: fs }
        }

        const base = pagePadding.value
        const margin = MAP_PADDING.EDGE_MARGIN

        let extra = { top: 0, bottom: 0, left: 0, right: 0 }
        if (typeof extraPadding === 'number') {
            extra = { top: extraPadding, bottom: extraPadding, left: extraPadding, right: extraPadding }
        } else if (extraPadding) {
            extra = {
                top: extraPadding.top ?? 0,
                bottom: extraPadding.bottom ?? 0,
                left: extraPadding.left ?? 0,
                right: extraPadding.right ?? 0
            }
        }

        const result = {
            top: Math.round(base.top + margin + extra.top),
            bottom: Math.round(base.bottom + margin + extra.bottom),
            left: Math.round(base.left + margin + extra.left),
            right: Math.round(base.right + margin + extra.right)
        }
        console.log('getEffectivePadding result', result)
        return result
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
        stops.value = allStopsData
        allStops.value = allStopsData

        // Only animate the map on the FIRST visit to a general-view page.
        // Subsequent navigations (home→lines→home) just refresh data.
        if (!generalViewPositioned) {
            // Try to get user location and update map
            let locationFound = !!geolocation.userLocation.value
            if (!locationFound && !geolocation.permissionDenied.value) {
                locationFound = await geolocation.requestLocation()
                if (!locationFound && geolocation.isTooFar.value) {
                    useToast().add({
                        title: 'Ubicación lejana',
                        description: 'Estás a más de 15km de Salamanca. Mostrando vista general.',
                        icon: 'i-lucide-map-pin-off',
                        color: 'warning'
                    })
                }
            }

            if (locationFound) {
                await updateMapToUserLocation(allStopsData, geolocation)
            } else {
                showAllStops(allStopsData)
            }
            generalViewPositioned = true
        }

        startGlobalVehicleUpdates()
    }

    async function updateMapToUserLocation(allStopsData: BusStop[], geolocation: ReturnType<typeof useGeolocation>) {
        if (!geolocation.userLocation.value) return

        const points = [{
            lng: geolocation.userLocation.value.lng,
            lat: geolocation.userLocation.value.lat
        }]

        // Stops are already set by the caller — only trigger the position update
        updatePositionWithMapPreviewContainer(points, {
            zoom: 15,
        })
    }

    async function setContextToStopPage(stopId: string) {
        console.log('[MapStore] setContextToStopPage', stopId)

        // Reset debounce so focusOnStop position always fires immediately
        resetPositionDebounce()

        // Check if we are already highlighting this stop to prevent flicker
        const preservingHighlight = highlightStopId.value === stopId

        if (currentContext.value !== 'stop' || currentContextId.value !== stopId) {
            clearContext()

            // Restore highlight immediately if we were preserving it
            if (preservingHighlight) {
                highlightStopId.value = stopId
            }

            currentContext.value = 'stop'
            currentContextId.value = stopId
        }

        await nextTick() // Wait for DOM to settle (matching setContextToLinePage)
        setPagePaddingFromMapPreviewContainer()

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


        // Start auto-refresh for ARRIVALS (stop specific)
        refreshInterval = setInterval(() => {
            if (currentContext.value === 'stop' && currentContextId.value === stopId) {
                fetchArrivalsForStop(stopId)
            }
        }, 10000)

        // Use global updates for VEHICLES (3s)
        startGlobalVehicleUpdates()
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

            // vehicles.value = arrivalVehicles // DON'T OVERWRITE GLOBAL VEHICLES WITH PARTIAL ARRIVALS
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
     * Line detail page context: Show all stops on line, fetch vehicles, and draw route
     */
    async function setContextToLinePage(lineId: string) {
        console.log('[MapStore] setContextToLinePage', lineId)

        // Reset debounce so focusOnLine position always fires immediately
        resetPositionDebounce()

        // Prevent re-entry if already on this line (unless foreced?)
        // If we are already on this line, we might still want to refresh vehicles but not everything else.
        // For simplicity and robustness, currently we reset context to ensure clean state.

        clearContext()
        currentContext.value = 'line'
        currentContextId.value = lineId
        // setFullscreen(false) // Force disable fullscreen to ensure zoom/pads are correct
        isFullscreen.value = false
        isInteractive.value = false
        showControls.value = false

        await nextTick();
        setPagePaddingFromMapPreviewContainer()

        const busService = useBusService()

        // 1. Load all stops
        const allStopsData = await busService.fetchStops()

        // Abort if context changed during await
        if (currentContextId.value !== lineId) return

        stops.value = allStopsData

        // Filter for bounds calculation only
        const lineStops = allStopsData
            .filter(s => s.lines?.includes(lineId))
            .sort((a, b) => parseInt(a.id) - parseInt(b.id))

        if (lineStops.length > 0) {
            focusOnLine(lineId, lineStops)
        }

        // 2. Fetch Line Info & Draw Geometry (Centralized Logic)
        drawLineGeometry(lineId, lineStops, busService)

        // 3. Fetch vehicles
        updateVehiclesInternal(busService, lineId, lineStops)

        // Use global updates (3s)
        startGlobalVehicleUpdates()
    }

    async function drawLineGeometry(lineId: string, lineStops: BusStop[], busService: any) {
        // Clear existing lines first
        linesToDraw.value = []

        try {
            if (currentContextId.value !== lineId) return
            const hex = getLineColorHex(lineId)

            if (!preloadedLineGeometries.value || !preloadedLineGeometries.value[lineId]) {
                await fetchLineGeometry(lineId)
            }

            if (currentContextId.value !== lineId) return

            if (preloadedLineGeometries.value && preloadedLineGeometries.value[lineId]) {
                const dirs = preloadedLineGeometries.value[lineId]

                if (Array.isArray(dirs)) {
                    const result = dirs.map((dir: any) => ({
                        ...dir,
                        color: hex
                    }))
                    setLines(result)
                    return
                }
            }

            console.warn(`[MapStore] No geometry cached for line ${lineId}, falling back to straight lines`)
            const allLines = await busService.fetchLines()
            if (currentContextId.value !== lineId) return

            const lineInfo = allLines.find((l: BusLine) => l.id === lineId)
            const straightLines: { id: string, color: string, points: { lat: number, lng: number }[], opacity?: number }[] = []

            if (lineInfo?.directions && lineInfo.directions.length > 0) {
                lineInfo.directions.forEach((dir: any, idx: number) => {
                    const points: { lat: number; lng: number }[] = []

                    dir.stops.forEach((stopRef: any) => {
                        const stop = stops.value.find(s => s.id === stopRef.id)
                        if (stop && stop.latitude && stop.longitude) {
                            points.push({ lat: stop.latitude, lng: stop.longitude })
                        }
                    })

                    if (points.length > 1) {
                        const lineIdPart = `${lineId}-${dir.id || idx}`
                        straightLines.push({ id: lineIdPart, color: hex, points })
                    }
                })
            }

            if (straightLines.length === 0 && lineStops.length > 1) {
                const points: { lat: number; lng: number }[] = []
                const validStops = lineStops.filter(s => s.latitude && s.longitude)
                validStops.forEach(s => points.push({ lat: s.latitude!, lng: s.longitude! }))

                if (points.length > 1) {
                    straightLines.push({ id: lineId, color: hex, points })
                }
            }

            if (straightLines.length > 0) {
                setLines(straightLines)
            }

        } catch (e) {
            console.error('Error drawing line geometry:', e)
        }
    }

    async function updateVehiclesGlobal() {
        const busService = useBusService()
        try {
            const globalData = await busService.fetchVehicles()

            // Updates raw data always
            if (globalData.length > 0) {
                rawVehicles.value = globalData
            }

            // Context-aware update of DISPLAY vehicles
            // If we are in 'map' context, we use the centralized filter logic
            // If we are in 'home', 'line', 'stop', we want to show relevant vehicles.
            // But now we want to support 'show all' even there, or at least 'show relevant'.

            if (currentContext.value === 'map') {
                updateDisplay()
                return
            }

            // For other contexts, update display vehicles directly (if not null)
            // But wait, if context is 'line', we might want to filter by line?
            // Actually, BaseMap takes `vehicles` prop.
            // Let's safe-guard: if context is 'home' or 'line' or 'stop', we update provided we have data.

            if (globalData.length > 0) {
                vehicles.value = globalData

                // Update followed vehicle if exists
                if (selectedVehicle.value) {
                    updateFollowedVehicle(globalData)
                }
            } else if (vehicles.value.length > 0) {
                console.warn('[MapStore] Received 0 vehicles, keeping stale data to prevent flickering')
            }
        } catch (e) {
            console.error('Error updating vehicles:', e)
        }
    }

    function startGlobalVehicleUpdates() {
        clearVehicleInterval()
        updateVehiclesGlobal() // Initial fetch
        vehicleInterval = setInterval(() => {
            updateVehiclesGlobal()
        }, 3000)
    }

    // Deprecated / Reused logic
    async function updateVehiclesInternal(busService: any, lineId?: string, lineStops?: BusStop[]) {
        // With global updates, we don't need context-specific internal updates for vehicles?
        // Actually, line page context might want to filter?
        // User said "show *all* vehicles ... active, ghost/transparent or highlighted".
        // So we should fetch ALL vehicles even in Line page.
        // And the VIEW (template) handles highlighting the line vehicles.
        // So `updateVehiclesInternal` is obsolete, we use `updateVehiclesGlobal`.
        await updateVehiclesGlobal()
    }

    // Fallback: If we are in a specific line context, ENABLE FALLBACK via arrivals if the line is missing
    // Fallback logic and duplicates removed




    /**
     * Full map page context: Interactive map with all stops and live vehicles
     */
    async function setContextToMapPage() {
        console.log('[MapStore] setContextToMapPage')
        // Do NOT clear vehicles to prevent flicker (keepVehicles = true)
        clearContext(true)
        currentContext.value = 'map'

        const busService = useBusService()
        const geolocation = useGeolocation()

        // Set to full interactive mode
        setMapState({
            isInteractive: true,
            // isFullscreen: true,
            showControls: true,
        })

        // Load all stops
        const allStopsData = await busService.fetchStops()
        stops.value = allStopsData

        // Request location
        geolocation.requestLocation()

        // Fetch vehicles (using global logic which fills rawVehicles)
        await updateVehiclesGlobal()

        // Start auto-refresh
        startGlobalVehicleUpdates()
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
    async function setContextToStopsListPage() {
        console.log('[MapStore] setContextToStopsListPage')
        clearContext()
        currentContext.value = 'stops-list'
        setFullscreen(false)

        setPagePaddingFromMapPreviewContainer()

        const busService = useBusService()

        // Load all stops
        const allStopsData = await busService.fetchStops()
        stops.value = allStopsData
        allStops.value = allStopsData

        // Only animate on first visit to a general-view page
        if (!generalViewPositioned) {
            const geolocation = useGeolocation()
            let locationFound = !!geolocation.userLocation.value
            if (!locationFound && !geolocation.permissionDenied.value) {
                locationFound = await geolocation.requestLocation()
                if (!locationFound && geolocation.isTooFar.value) {
                    useToast().add({
                        title: 'Ubicación lejana',
                        description: 'Estás a más de 15km de Salamanca. Mostrando vista general.',
                        icon: 'i-lucide-map-pin-off',
                        color: 'warning'
                    })
                }
            }

            if (locationFound) {
                await updateMapToUserLocation(allStopsData, geolocation)
            } else {
                showAllStops(allStopsData)
            }
            generalViewPositioned = true
        }

        startGlobalVehicleUpdates()
    }

    /**
     * Lines list page context: Simple list, no map interaction
     */
    async function setContextToLinesListPage() {
        console.log('[MapStore] setContextToLinesListPage')
        clearContext()
        currentContext.value = 'lines-list'
        setFullscreen(false)

        setPagePaddingFromMapPreviewContainer()

        const busService = useBusService()

        // Load all stops
        const allStopsData = await busService.fetchStops()
        stops.value = allStopsData
        allStops.value = allStopsData

        // Only animate on first visit to a general-view page
        if (!generalViewPositioned) {
            const geolocation = useGeolocation()
            let locationFound = !!geolocation.userLocation.value
            if (!locationFound && !geolocation.permissionDenied.value) {
                locationFound = await geolocation.requestLocation()
                if (!locationFound && geolocation.isTooFar.value) {
                    useToast().add({
                        title: 'Ubicación lejana',
                        description: 'Estás a más de 15km de Salamanca. Mostrando vista general.',
                        icon: 'i-lucide-map-pin-off',
                        color: 'warning'
                    })
                }
            }

            if (locationFound) {
                await updateMapToUserLocation(allStopsData, geolocation)
            } else {
                showAllStops(allStopsData)
            }
            generalViewPositioned = true
        }

        startGlobalVehicleUpdates()
    }


    async function setContextToRoutePage() {
        console.log('[MapStore] setContextToRoutePage')
        const previousContext = currentContext.value
        clearContext()
        currentContext.value = 'route'

        // We do NOT want fullscreen for the route planning page itself
        // It should look like the home page (map background + overlay)
        setFullscreen(false)
        isInteractive.value = false

        // Ensure stops are loaded (for map display)
        const busService = useBusService()
        if (stops.value.length === 0) {
            const allStopsData = await busService.fetchStops()
            stops.value = allStopsData
        }

        // Only reset camera if coming from a non-map page to avoid jarring jumps
        // But since we want to show the map background, maybe we should Ensure we have a valid view?
        // Only reset camera if coming from a non-map page to avoid jarring jumps
        if (previousContext !== 'home' && previousContext !== 'map') {
            updatePosition([{ lng: -5.6635, lat: 40.9701 }], { zoom: 14, type: 'manual' })
        }

        startGlobalVehicleUpdates()
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

    // ===== Visibility Actions =====

    function toggleShowStops(value?: boolean) {
        showStops.value = value !== undefined ? value : !showStops.value
        updateDisplay()
    }

    function toggleShowVehicles(value?: boolean) {
        showVehicles.value = value !== undefined ? value : !showVehicles.value
        updateDisplay()
    }

    function toggleShowRoutes(value?: boolean) {
        showRoutes.value = value !== undefined ? value : !showRoutes.value
        updateDisplay()
    }

    function setFilterLineIds(ids: string[]) {
        filterLineIds.value = ids
        updateDisplay()
    }

    function updateDisplay() {
        // Filter Vehicles
        if (!showVehicles.value) {
            vehicles.value = []
        } else if (filterLineIds.value.length > 0) {
            vehicles.value = rawVehicles.value.filter(v => filterLineIds.value.includes(v.id) || filterLineIds.value.includes(v.lineId))
        } else {
            vehicles.value = rawVehicles.value
        }

        // Update followed vehicle if hidden
        if (selectedVehicle.value && !vehicles.value.find(v => v.id === selectedVehicle.value?.id)) {
            selectedVehicle.value = null
            highlightVehicleId.value = null
        }

        // Filter Stops
        if (!showStops.value) {
            stops.value = []
        } else if (filterLineIds.value.length > 0) {
            stops.value = allStops.value.filter(s =>
                s.lines?.some(lineId => filterLineIds.value.includes(lineId))
            )
        } else {
            // Restore all stops if they were loaded
            // But checks if we are in 'stop' context where we might want only one?
            // 'stop' context sets stops.value = allStops and uses highlighting. 
            // So if allStops has data, use it.
            if (allStops.value.length > 0) {
                stops.value = allStops.value
            }
        }

        // Filter Routes (handled by UI invoking setLines/drawLineGeometry usually)
        // But if we want to clear them when toggled off:
        if (!showRoutes.value) {
            linesToDraw.value = []
            // Note: If we want to restore them when toggled ON, we need to know what to restore.
            // For now, the UI watcher in Map.vue re-triggers the draw logic.
            // Ideally that logic should move here too, but step-by-step.
        }
    }


    // ===== MapPreview Registration =====
    const activeMapPreviewElement = ref<HTMLElement | null>(null)

    let ro: ResizeObserver | null = null;
    if (typeof window !== 'undefined' && window.ResizeObserver) {
        ro = new ResizeObserver(() => {
            if (hasPageMapPreview.value && !isFullscreen.value) {
                setPagePaddingFromMapPreviewContainer();
            }
        });
    }

    function registerMapPreview(el?: HTMLElement) {
        hasPageMapPreview.value = true
        if (el) {
            activeMapPreviewElement.value = el
            if (ro) {
                ro.disconnect()
                ro.observe(el)
            }
        }
    }

    function unregisterMapPreview(el?: HTMLElement) {
        if (el && activeMapPreviewElement.value === el) {
            activeMapPreviewElement.value = null
            if (ro) ro.disconnect()
            // Don't set hasPageMapPreview to false here, because another MapPreview might have just mounted
            // We'll let the mounting MapPreview handle the state, or we could check if active is null
            hasPageMapPreview.value = false
        } else if (!el) {
            hasPageMapPreview.value = false
            if (ro) ro.disconnect()
        }
    }

    return {
        // State
        center,
        zoom,
        rotation,
        pitch,
        stops,
        allStops,
        rawVehicles,
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
        isExitingFullscreen,
        isTransitioning,
        showControls,
        hasPageMapPreview,
        padding,
        pagePadding,
        mapInstance,
        positionEvent,
        currentContext,
        currentContextId,
        forceAnimations,
        routeOptions,
        isRouting,

        filterLineIds,
        showStops,
        showVehicles,
        showRoutes,
        showUserLocationButton,

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
        getEffectivePadding,
        clearHighlight,
        vehicleClick,
        updateFollowedVehicle,
        updateVehiclesGlobal,
        selectedVehicle,
        selectedRoute,
        selectRoute,
        calculateRoutes,
        clearRoutes,
        linesToDraw,
        setLines,

        // Context Handlers
        fetchLineGeometry,
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

        toggleShowStops,
        toggleShowVehicles,
        toggleShowRoutes,
        setFilterLineIds,
        updateDisplay,
        registerMapPreview,
        unregisterMapPreview,
        activeMapPreviewElement,
    }
})
