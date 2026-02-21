import { fetchArrivals } from '../../../../utils/siri'

export default defineEventHandler(async (event) => {
    const stopId = getRouterParam(event, 'id')

    if (!stopId) {
        throw createError({
            statusCode: 400,
            message: 'Stop ID is required',
        })
    }

    return await fetchArrivals(stopId)
})
