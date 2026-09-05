import { fetchStops } from '../../utils/siri'
import { loadReference } from '../../utils/referenceData'

export default defineEventHandler(async () => {
    const stops = await loadReference('bus-stops', fetchStops)

    if (!stops.length) {
        // Returning an empty catalogue would be cached and served as if it were the truth.
        // Fail instead: SIRI serves nothing outside service hours and recovers on its own.
        throw createError({ statusCode: 503, statusMessage: 'Stop catalogue unavailable upstream' })
    }

    return stops
})
