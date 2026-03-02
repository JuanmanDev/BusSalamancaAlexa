import { fetchVehiclesFromHubs } from '../../utils/vehicle_aggregator'

export default defineEventHandler(async () => {
    return await fetchVehiclesFromHubs()
})
