import { registerLineStops } from '../../utils/arrivalHistory'
import { loadLines } from '../../utils/catalogues'

export default defineEventHandler(async () => {
    const lines = await loadLines()

    if (!lines.length) {
        // See stops.get.ts: an empty catalogue must not become the cached answer.
        throw createError({ statusCode: 503, statusMessage: 'Line catalogue unavailable upstream' })
    }

    // Register stop sequences for travel time learning
    for (const line of lines) {
        if (line.directions) {
            registerLineStops(line.id, line.directions)
        }
    }

    return lines
})
