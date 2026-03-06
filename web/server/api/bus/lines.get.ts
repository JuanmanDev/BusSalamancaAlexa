import { fetchLines } from '../../utils/siri'
import { registerLineStops } from '../../utils/arrivalHistory'

export default defineCachedEventHandler(async () => {
    const lines = await fetchLines()

    // Register stop sequences for travel time learning
    for (const line of lines) {
        if (line.directions) {
            registerLineStops(line.id, line.directions)
        }
    }

    return lines
}, {
    maxAge: 3600, // Cache for 1 hour
    name: 'bus-lines-v3',
})
