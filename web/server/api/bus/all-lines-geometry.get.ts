import { fetchLines, fetchStops } from '../../utils/siri'

const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

async function retry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn()
        } catch (e) {
            if (i === retries - 1) throw e
            console.warn(`[Retry ${i + 1}/${retries}] Failed, waiting ${delayMs}ms...`, e)
            await delay(delayMs)
        }
    }
    throw new Error('Unreachable')
}

export default defineCachedEventHandler(async (event) => {
    try {
        const query = getQuery(event)
        const lineIdFilter = query.lineId as string | undefined

        console.log(`[Server] Generating geometry${lineIdFilter ? ` for line ${lineIdFilter}` : ' for all lines'}...`);

        // Add retries to SIRI fetches to handle ECONNRESET
        const [lines, stops] = await Promise.all([
            retry(() => fetchLines(), 3, 2000),
            retry(() => fetchStops(), 3, 2000)
        ])

        const allGeometry: Record<string, { id: string, color: string, points: { lat: number, lng: number }[] }[]> = {}
        const CHUNK_SIZE = 25

        // Prepare all tasks
        const directionTasks: { lineId: string, dirId: string, points: { lat: number, lng: number }[] }[] = []

        // Filter lines if lineId is specified
        const linesToProcess = lineIdFilter ? lines.filter(l => l.id === lineIdFilter) : lines

        // Process lines
        for (const line of linesToProcess) {
            allGeometry[line.id] = []

            if (line.directions && line.directions.length > 0) {
                line.directions.forEach((dir: any, idx: number) => {
                    const points: { lat: number; lng: number }[] = []
                    dir.stops.forEach((stopRef: any) => {
                        const stop = stops.find((s: any) => s.id === stopRef.id)
                        if (stop && stop.latitude && stop.longitude) {
                            points.push({ lat: stop.latitude, lng: stop.longitude })
                        }
                    })

                    if (points.length > 1) {
                        const lineIdPart = `${line.id}-${dir.id || idx}`
                        directionTasks.push({ lineId: line.id, dirId: dir.id || idx.toString(), points })
                    }
                })
            } else {
                // Fallback if no explicit directions
                const lineStops = stops.filter(s => s.lines?.includes(line.id)).sort((a, b) => parseInt(a.id) - parseInt(b.id))
                const validStops = lineStops.filter(s => s.latitude && s.longitude)
                const points = validStops.map(s => ({ lat: s.latitude!, lng: s.longitude! }))
                if (points.length > 1) {
                    directionTasks.push({ lineId: line.id, dirId: line.id, points })
                }
            }
        }

        // Process OSRM fetches with concurrency limit (e.g. 5 parallel to not slam the public OSRM API too hard)
        const CONCURRENCY = 5;
        let activePromises = [];

        for (const task of directionTasks) {
            const p = (async () => {
                const geomPoints: { lat: number, lng: number }[] = []
                for (let i = 0; i < task.points.length - 1; i += (CHUNK_SIZE - 1)) {
                    const chunk = task.points.slice(i, i + CHUNK_SIZE)
                    if (chunk.length < 2) continue

                    const coordinates = chunk.map(p => `${p.lng},${p.lat}`).join(';')
                    const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`

                    try {
                        // Retry OSRM fetches specifically
                        const data = await retry(async () => {
                            const response = await fetch(url)
                            if (!response.ok) throw new Error(`OSRM HTTP error: ${response.status}`)
                            return await response.json()
                        }, 2, 500)

                        if (data.routes && data.routes.length > 0) {
                            const route = data.routes[0]
                            const geojson = route.geometry
                            if (geojson && Array.isArray(geojson.coordinates)) {
                                const coords: number[][] = geojson.coordinates
                                const segmentCoords = coords.map((c: number[]) => ({
                                    lng: c[0]!,
                                    lat: c[1]!
                                }))

                                if (geomPoints.length > 0) segmentCoords.shift()
                                geomPoints.push(...segmentCoords)
                            }
                        } else {
                            if (geomPoints.length > 0) chunk.shift()
                            geomPoints.push(...chunk)
                        }
                    } catch (e: any) {
                        console.warn(`[OSRM] Failed chunk for line ${task.lineId}, falling back to straight points`, e.message)
                        if (geomPoints.length > 0) chunk.shift()
                        geomPoints.push(...chunk)
                    }

                    await delay(100) // Small spacing
                }

                if (geomPoints.length < 2) {
                    geomPoints.push(...task.points)
                }

                if (!allGeometry[task.lineId]) allGeometry[task.lineId] = []
                allGeometry[task.lineId].push({
                    id: task.dirId,
                    color: '', // Will be assigned by client
                    points: geomPoints
                })
            })();

            activePromises.push(p);

            if (activePromises.length >= CONCURRENCY) {
                await Promise.all(activePromises)
                activePromises = []
            }
        }

        // Wait for remaining
        if (activePromises.length > 0) {
            await Promise.all(activePromises)
        }

        console.log('[Server] Finished generating all lines geometry.');
        return allGeometry

    } catch (e: any) {
        console.error('CRITICAL Error in all-lines-geometry:', e)
        // Throwing error instead of returning null prevents defineCachedEventHandler from caching a bad response
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to generate geometries',
            cause: e
        })
    }

}, {
    maxAge: 60 * 60 * 24, // Cache for 24 hours
    name: 'all-lines-geometry-v7',
})
