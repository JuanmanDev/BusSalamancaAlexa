import { getSegmentStats, getHistoryDiagnostics } from '../../utils/arrivalHistory'

/**
 * API endpoint: GET /api/bus/arrival-stats
 *
 * Returns computed segment travel statistics from historical arrival observations.
 * Used by the client-side TransitGraph to improve edge weights beyond static estimates.
 */
export default defineEventHandler(async () => {
    const stats = getSegmentStats()
    const diagnostics = getHistoryDiagnostics()

    return {
        stats,
        meta: {
            ...diagnostics,
            generatedAt: new Date().toISOString(),
        },
    }
})
