/**
 * Pinia store for global map state management
 * Controls the background map in the default layout
 */

import type { BusStop, BusVehicle } from '~/types/bus'

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
    padding: { top: nuber; bottom: number; left: number; right: number }
    pagePadding: { top: nuber; bottom: number; left: number; right: number }

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

export const useMapStore = defineStore('map', () => {
    // Default center: Salamanca Plaza Mayor
    const center = ref<[number, number]>([-5.6635, 40.9701])
    const zoom = ref(14)
    const padding = ref({ top: 0, bottom: 0, left: 0, right: 0 })
    const pagePadding = ref({ top: 0, bottom: 0, left: 0, right: 0 })

    const stops = ref<BusStop[]>([])
    const allStops = ref<BusStop[]>([]) // Preserve full stops list for restoration
    const vehicles = ref<BusVehicle[]>([])

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

    // Actions
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

        let padding = { top: 0, bottom: 0, left: 0, right: 0 };
        if (!isFullscreen.value) {
            padding = pagePadding.value
        }

        console.log('updatePositionWithMapPreviewContainer padding', padding);

        positionEvent.value = {
            id: Date.now(),
            type: options.type || 'manual',
            points,
            zoom: options.zoom,
            padding: padding
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
    function updateFollowedVehicle(vehicles: BusVehicle[]) {
        if (!selectedVehicle.value) return

        const updated = vehicles.find(v => v.id === selectedVehicle.value?.id)
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

    function showAllStops(allStops: BusStop[]) {
        console.log('showAllStops', allStops.length);
        stops.value = allStops
        highlightStopId.value = null
        highlightLineId.value = null

        // Reset view to Salamanca default
        updatePosition([{ lng: -5.6635, lat: 40.9701 }], { zoom: 14, type: 'manual' })
    }

    function setFullscreen(value: boolean) {
        isFullscreen.value = value
        isInteractive.value = value
        showControls.value = value

        // if (isFullscreen.value) {
        //     // Make the points cover the screen
        //     padding.value = { top: 0, bottom: 0, left: 0, right: 0 }
        // } else {
        //     // Make the point to fit inside the top 60% of the screen and full width
        //     padding.value = { top: 0, bottom: 500, left: 0, right: 0 }
        // }


        // Retrigger last position event to adjust layout (padding) if needed
        if (positionEvent.value) {
            //positionEvent.value = { ...positionEvent.value, id: Date.now() }
            updatePositionWithMapPreviewContainer(positionEvent.value.points, { ...positionEvent.value, padding: padding.value, type: 'manual' })
        }
    }

    function reset() {
        console.log('reset map');
        updatePosition([{ lng: -5.6635, lat: 40.9701 }], { zoom: 14, type: 'manual' })
        stops.value = []
        vehicles.value = []
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

    function setPagePadding(padding: { top: number; bottom: number; left: number; right: number }) {
        pagePadding.value = padding
    }

    function setPagePaddingFromMapPreviewContainer() {

        const mapPreviewContainer = document.getElementById('mapPreviewContainer')


        let padding = { top: 0, bottom: 0, left: 0, right: 0 };
        if (!isFullscreen.value && mapPreviewContainer) {
            // Como se hace uns translet, los valores la segunda vez son erroneos
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

    return {
        // State
        center,
        zoom,
        stops,
        allStops,
        vehicles,
        highlightStopId,
        highlightLineId,
        highlightVehicleId,
        isInteractive,
        isFullscreen,
        showControls,
        padding,
        mapInstance,
        positionEvent,

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
    }
})

