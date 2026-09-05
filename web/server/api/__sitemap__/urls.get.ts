import { fetchStops, fetchLines } from '../../utils/siri'
import { loadReference } from '../../utils/referenceData'

/**
 * Dynamic sitemap source for @nuxtjs/sitemap.
 * Returns every stop and line page; `_i18nTransform` makes the module emit one URL per locale
 * with the proper hreflang alternates.
 *
 * This used to cache its result for twelve hours and swallow failures with `catch(() => [])`.
 * Since SIRI serves no catalogue at night, one unlucky refresh published a sitemap of twelve
 * URLs — telling search engines the ~390 stop and line pages no longer existed. The catalogues
 * now come from loadReference, which never lets an empty answer replace a good one.
 */
export default defineEventHandler(async () => {
    const [stops, lines] = await Promise.all([
        loadReference('bus-stops', fetchStops),
        loadReference('bus-lines', fetchLines),
    ])

    const urls: { loc: string; changefreq?: string; priority?: number; _i18nTransform: boolean }[] = []

    for (const line of lines) {
        urls.push({ loc: `/line/${line.id}`, changefreq: 'weekly', priority: 0.8, _i18nTransform: true })
    }
    for (const stop of stops) {
        urls.push({ loc: `/stop/${stop.id}`, changefreq: 'weekly', priority: 0.6, _i18nTransform: true })
    }
    return urls
})
