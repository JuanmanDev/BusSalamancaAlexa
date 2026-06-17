import { fetchPositions } from '../../utils/positions'
import { fetchVehiclesFromHubs } from '../../utils/vehicle_aggregator'

export default defineEventHandler(async () => {
    try {
        const positions = await fetchPositions()
        if (positions.length > 0) return positions
    } catch (e) {
        console.warn('[Vehicles] Positions API failed, falling back to hub aggregator', e)
    }
    return await fetchVehiclesFromHubs()
})
