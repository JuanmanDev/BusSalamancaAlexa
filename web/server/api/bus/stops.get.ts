import { fetchStops } from '../../utils/siri'

export default defineCachedEventHandler(async () => {
    return await fetchStops()
}, {
    maxAge: 3600, // Cache for 1 hour
    name: 'bus-stops',
})
