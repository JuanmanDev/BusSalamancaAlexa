import type { AsyncDataOptions } from '#app'
import type { BusStop, BusLine } from '~/types/bus'

export const useBusStops = (options?: AsyncDataOptions<BusStop[]>) => {
    const busService = useBusService()
    const asyncData = useAsyncData<BusStop[]>('all-stops', () => busService.fetchStops(), {
        server: true,
        default: () => ([] as BusStop[]),
        ...options
    } as any)

    if (import.meta.client) {
        onNuxtReady(() => {
            refreshNuxtData('all-stops')
        })
    }

    return asyncData
}

export const useBusLines = (options?: AsyncDataOptions<BusLine[]>) => {
    const busService = useBusService()
    const asyncData = useAsyncData<BusLine[]>('all-lines-v3', () => busService.fetchLines(), {
        server: true,
        default: () => ([] as BusLine[]),
        ...options
    } as any)

    if (import.meta.client) {
        onNuxtReady(() => {
            refreshNuxtData('all-lines-v3')
        })
    }

    return asyncData
}

