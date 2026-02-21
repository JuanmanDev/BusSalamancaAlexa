export async function fetchRouteGeometry(points: { lat: number; lng: number }[]): Promise<{ lat: number; lng: number }[]> {
    if (points.length < 2) return points

    // Limit to ~25 waypoints per request to avoid URL length issues (OSRM demo server limits, safe bet)
    // For a bus line with > 25 stops, we might need to chunk it.
    // However, usually OSRM handles reasonable lengths. Max URL length ~2k chars.
    // 25 stops * 20 chars = 500 chars. Safe.
    // Let's chunk if > 25 just in case.

    const CHUNK_SIZE = 25
    const allGeometry: { lat: number; lng: number }[] = []

    for (let i = 0; i < points.length - 1; i += (CHUNK_SIZE - 1)) {
        // Overlap by 1 to connect chunks
        const chunk = points.slice(i, i + CHUNK_SIZE)
        if (chunk.length < 2) continue

        const coordinates = chunk.map(p => `${p.lng},${p.lat}`).join(';')
        const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`

        try {
            const response = await fetch(url)
            if (!response.ok) throw new Error('OSRM Fetch Failed')

            const data = await response.json()
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0]
                const geojson = route.geometry

                if (geojson && geojson.coordinates) {
                    const segmentCoords = geojson.coordinates.map((c: number[]) => ({
                        lng: c[0],
                        lat: c[1]
                    }))

                    // If not first chunk, remove the first point as it duplicates the last point of previous chunk
                    if (allGeometry.length > 0) {
                        segmentCoords.shift()
                    }
                    allGeometry.push(...segmentCoords)
                }
            } else {
                // Fallback to straight line for this chunk
                if (allGeometry.length > 0) chunk.shift()
                allGeometry.push(...chunk)
            }
        } catch (e) {
            console.warn('OSRM fallback to straight lines', e)
            // Fallback to straight line
            if (allGeometry.length > 0) chunk.shift()
            allGeometry.push(...chunk)
        }
    }

    return allGeometry
}
