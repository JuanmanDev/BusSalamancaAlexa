/**
 * Salamanca de Transportes' own JSON API — the one behind salamancadetransportes.com's
 * "tiempos de llegada" page.
 *
 * It fronts the same SIRI data as the SOAP service in `siri.ts`, but it is a plain JSON GET that
 * answers in a fraction of a second, and it stayed up when the SOAP host stopped accepting
 * connections. It sits behind Cloudflare, which rejects requests that look like a script (curl's
 * default User-Agent gets a 403), hence the browser-like headers.
 */

const BASE_URL = 'https://salamancadetransportes.com'
const TIMEOUT_MS = Number(process.env.TRANSPORTES_TIMEOUT_MS) || 5000

const HEADERS = {
    'accept': 'application/json, */*',
    'accept-language': 'es',
    'cache-control': 'no-cache',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'referer': `${BASE_URL}/tiempos-de-llegada`,
}

async function getData(path: string): Promise<any[]> {
    const response = await fetch(`${BASE_URL}${path}`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!response.ok) {
        throw new Error(`Transportes API error: ${response.status} ${response.statusText} (${path})`)
    }

    const body = await response.json()
    if (!body || !Array.isArray(body.data)) {
        throw new Error(`Transportes API returned an unexpected body for ${path}`)
    }
    return body.data
}

/**
 * `aimedArrival` comes without an offset ("2026-10-28T10:10:00") and is Madrid wall-clock time,
 * while `expectedArrival` carries one ("…+01:00"). Borrowing the latter's offset reads the
 * former correctly, and both always fall on the same side of a DST change in practice.
 */
function withOffsetOf(local: string | undefined, reference: string | undefined): Date | null {
    if (!local) return null
    if (/[zZ]|[+-]\d\d:?\d\d$/.test(local)) return new Date(local)
    const offset = reference?.match(/[+-]\d\d:\d\d$/)?.[0] ?? 'Z'
    const date = new Date(`${local}${offset}`)
    return isNaN(date.getTime()) ? null : date
}

/** "Zurguén (196) > Capuchinos (317)" → "Capuchinos": where the bus is heading, without stop ids. */
function destinationOf(directionName: string | undefined): string {
    if (!directionName) return ''
    const last = directionName.split('>').pop() ?? ''
    return last.replace(/\(\s*\d+\s*\)/g, '').replace(/\s+/g, ' ').trim()
}

/** The API title-cases names, which turns "Juan Pablo II" into "Juan Pablo Ii". */
function fixRomanNumerals(name: string): string {
    return name.replace(/\b[IVXLC][ivxlc]+\b/g, numeral => numeral.toUpperCase())
}

/** Same shape as `fetchArrivals` in `siri.ts`, so callers cannot tell which source answered. */
export async function fetchTransportesArrivals(stopId: string) {
    const data = await getData(`/api/siri/arrivals?stop=${encodeURIComponent(stopId)}`)
    const now = Date.now()

    return data.map((visit: any) => {
        const expected = withOffsetOf(visit.expectedArrival, visit.expectedArrival)
        const aimed = withOffsetOf(visit.aimedArrival, visit.expectedArrival)
        const expectedDate = expected ?? aimed ?? new Date(now)
        const latitude = parseFloat(visit.latitude)
        const longitude = parseFloat(visit.longitude)

        return {
            lineId: String(visit.lineCode ?? ''),
            lineName: String(visit.lineCode ?? ''),
            destination: destinationOf(visit.directionName),
            expectedArrivalTime: expectedDate.toISOString(),
            aimedArrivalTime: aimed ? aimed.toISOString() : null,
            minutesRemaining: Math.max(0, Math.round((expectedDate.getTime() - now) / 60000)),
            vehicleRef: visit.vehicleId ? String(visit.vehicleId) : null,
            location: Number.isFinite(latitude) && Number.isFinite(longitude) && latitude !== 0
                ? { latitude, longitude }
                : undefined,
            isEstimate: !expected,
        }
    }).sort((a, b) => a.minutesRemaining - b.minutesRemaining)
}

/** Same shape as `fetchStops` in `siri.ts`. */
export async function fetchTransportesStops() {
    const data = await getData('/api/siri/stops')

    return data.map((stop: any) => {
        const latitude = parseFloat(stop.latitude)
        const longitude = parseFloat(stop.longitude)
        return {
            id: String(stop.stopRef ?? ''),
            name: fixRomanNumerals(String(stop.stopName ?? '')),
            latitude: Number.isFinite(latitude) ? latitude : undefined,
            longitude: Number.isFinite(longitude) ? longitude : undefined,
            // Listed once per direction; the SOAP catalogue lists each line once.
            lines: [...new Set<string>((stop.lineRefs ?? []).map(String))],
        }
    }).filter(stop => stop.id)
}
