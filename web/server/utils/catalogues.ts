import { fetchStops, fetchLines } from './siri'
import { fetchTransportesStops } from './transportes'
import { loadReference, type ChangeTracking } from './referenceData'

/**
 * The stop and line catalogues, loaded through the last-known-good layer.
 *
 * Both are defined here rather than in each route so the change-tracking fingerprints stay in
 * one place: they decide what counts as a change for the sitemap's `lastmod`, and two routes
 * disagreeing about that would make the dates jitter.
 */

export const STOPS_KEY = 'bus-stops'
export const LINES_KEY = 'bus-lines'

/** A stop page shows its name and the lines calling there — nothing else affects the page. */
const stopTracking: ChangeTracking<any> = {
    id: stop => String(stop.id),
    fingerprint: stop => JSON.stringify([stop.name ?? '', [...(stop.lines ?? [])].sort()]),
}

/** A line page shows its name and the ordered stops of each direction. */
const lineTracking: ChangeTracking<any> = {
    id: line => String(line.id),
    fingerprint: line => JSON.stringify([
        line.name ?? '',
        (line.directions ?? []).map((d: any) => [d.name ?? '', (d.stops ?? []).map((s: any) => String(s.id))]),
    ]),
}

/**
 * SOAP first, because its names are the originals ("Juan Pablo II", "AV. Obispo…") and switching
 * source back and forth would move `lastmod` for the handful of stops the two spell differently.
 * The JSON API has the same stops, lines and coordinates, so it is a sound fallback when SOAP is
 * down — which is what stops a server with no snapshot from having no catalogue at all.
 */
async function fetchStopsFromAnySource() {
    try {
        const stops = await fetchStops()
        if (stops.length) return stops
    } catch (error) {
        console.warn('[catalogues] SOAP stops failed, trying the JSON API:', (error as Error).message)
    }
    return await fetchTransportesStops()
}

export function loadStops() {
    return loadReference(STOPS_KEY, fetchStopsFromAnySource, undefined, stopTracking)
}

export function loadLines() {
    return loadReference(LINES_KEY, fetchLines, undefined, lineTracking)
}
