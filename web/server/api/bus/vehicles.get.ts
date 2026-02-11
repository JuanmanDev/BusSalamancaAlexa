import { fetchVehicles } from '../../utils/siri'

export default defineEventHandler(async () => {
    return await fetchVehicles()
})
