import { fetchLines } from '../../utils/siri'

export default defineCachedEventHandler(async () => {
    return await fetchLines()
}, {
    maxAge: 3600, // Cache for 1 hour
    name: 'bus-lines-v3',
})
