import { LINES_KEY, STOPS_KEY, loadLines, loadStops } from '../../utils/catalogues'
import { getLastModified } from '../../utils/referenceData'

/**
 * Dynamic sitemap source for @nuxtjs/sitemap.
 * Returns every stop and line page; `_i18nTransform` makes the module emit one URL per locale
 * with the proper hreflang alternates.
 *
 * This used to cache its result for twelve hours and swallow failures with `catch(() => [])`.
 * Since SIRI serves no catalogue at night, one unlucky refresh published a sitemap of twelve
 * URLs — telling search engines the ~390 stop and line pages no longer existed. The catalogues
 * now come from the last-known-good layer, which never lets an empty answer replace a good one.
 *
 * `lastmod` is the date that stop's or line's own content last changed, not the date of this
 * request: a sitemap where everything changed today is one search engines learn to ignore.
 */
export default defineEventHandler(async () => {
    const [stops, lines, stopsChanged, linesChanged] = await Promise.all([
        loadStops(),
        loadLines(),
        getLastModified(STOPS_KEY),
        getLastModified(LINES_KEY),
    ])

    const urls: {
        loc: string
        lastmod?: string
        changefreq?: string
        priority?: number
        _i18nTransform: boolean
    }[] = []

    for (const line of lines) {
        urls.push({
            loc: `/line/${line.id}`,
            lastmod: linesChanged[String(line.id)],
            changefreq: 'weekly',
            priority: 0.8,
            _i18nTransform: true,
        })
    }
    for (const stop of stops) {
        urls.push({
            loc: `/stop/${stop.id}`,
            lastmod: stopsChanged[String(stop.id)],
            changefreq: 'weekly',
            priority: 0.6,
            _i18nTransform: true,
        })
    }
    return urls
})
