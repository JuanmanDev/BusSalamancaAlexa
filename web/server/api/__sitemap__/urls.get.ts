import { fetchStops, fetchLines } from '../../utils/siri'

/**
 * Dynamic sitemap source for @nuxtjs/sitemap.
 * Returns every stop and line page; `_i18nTransform` makes the module emit one URL per locale
 * with the proper hreflang alternates.
 */
export default defineCachedEventHandler(async () => {
    const [stops, lines] = await Promise.all([
        fetchStops().catch(() => [] as any[]),
        fetchLines().catch(() => [] as any[]),
    ])

    const urls: { loc: string; changefreq?: string; priority?: number; _i18nTransform: boolean }[] = []

    for (const line of lines) {
        urls.push({ loc: `/line/${line.id}`, changefreq: 'weekly', priority: 0.8, _i18nTransform: true })
    }
    for (const stop of stops) {
        urls.push({ loc: `/stop/${stop.id}`, changefreq: 'weekly', priority: 0.6, _i18nTransform: true })
    }
    return urls
}, {
    maxAge: 60 * 60 * 12,
    name: 'sitemap-urls',
})
