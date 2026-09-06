import { getServiceStatus } from '../../utils/serviceStatus'

/**
 * Is the upstream bus service reachable? Always answers 200 — a status endpoint that fails when
 * the thing it reports on fails is no use to anyone asking.
 */
export default defineEventHandler(async () => {
    return await getServiceStatus()
})
