import type { AsyncDataOptions } from '#app'
import type { BusStop, BusLine } from '~/types/bus'

export const useBusStops = (options?: AsyncDataOptions<BusStop[]>) => {
    const busService = useBusService()
    return useAsyncData<BusStop[]>('all-stops', () => busService.fetchStops(), {
        server: true,
        lazy: true,
        default: () => [],
        ...options
    })
}

export const useBusLines = (options?: AsyncDataOptions<BusLine[]>) => {
    const busService = useBusService()
    return useAsyncData<BusLine[]>('all-lines', () => busService.fetchLines(), {
        server: true,
        lazy: true,
        default: () => [],
        ...options
    })
}
