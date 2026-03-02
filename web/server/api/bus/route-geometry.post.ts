import { defineEventHandler, readBody } from 'h3'
import { hash } from 'ohash'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const points = body.points as { lat: number; lng: number }[]

    if (!points || points.length < 2) return points

    // Generate a unique key for this route segment
    const key = hash(points)

    // Check cache
    const storage = useStorage('cache:osrm') // Use specific namespace
    const cached = await storage.getItem(key)

    if (cached) {
        return cached
    }

    // Fetch from OSRM
    // Chunking logic (similar to client-side but robust)
    const CHUNK_SIZE = 25
    const allGeometry: { lat: number; lng: number }[] = []

    try {
        for (let i = 0; i < points.length - 1; i += (CHUNK_SIZE - 1)) {
            const chunk = points.slice(i, i + CHUNK_SIZE)
            if (chunk.length < 2) continue

            const coordinates = chunk.map(p => `${p.lng},${p.lat}`).join(';')
            const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`

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

                    if (allGeometry.length > 0) segmentCoords.shift()
                    allGeometry.push(...segmentCoords)
                }
            } else {
                if (allGeometry.length > 0) chunk.shift()
                allGeometry.push(...chunk)
            }
        }

        // Cache result (1 week TTL effectively, manual invalidation if needed)
        await storage.setItem(key, allGeometry)
        return allGeometry

    } catch (e) {
        console.error('OSRM Server Error:', e)
        // Return original straight lines on error
        return points
    }
})
