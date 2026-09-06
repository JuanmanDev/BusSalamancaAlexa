import type { ComputedRef } from 'vue'

export interface BreadcrumbItem {
    name: string
    /** Locale-aware path, e.g. from `localePath('/stops')`. Omit on the current page. */
    path?: string
}

/**
 * Emits `BreadcrumbList` structured data for the current page.
 *
 * Search engines use it to show the trail instead of a bare URL under the result, and it tells
 * them how a stop or line page sits under its listing rather than floating on its own. The
 * trail is built from the already-translated `nav.*` strings, so it matches what the user sees.
 *
 * The last item deliberately carries no `item` URL: it is the page being viewed, and the spec
 * treats a self-referencing final crumb as redundant.
 */
export function useBreadcrumbs(items: ComputedRef<BreadcrumbItem[]>) {
    const config = useRuntimeConfig()
    const siteUrl = (config.public.site as { url?: string } | undefined)?.url
        ?? 'https://bussalamanca.juanman.tech'

    useHead({
        script: [{
            type: 'application/ld+json',
            innerHTML: computed(() => {
                const trail = items.value.filter(item => item.name)
                if (trail.length < 2) return ''

                return JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'BreadcrumbList',
                    itemListElement: trail.map((item, index) => ({
                        '@type': 'ListItem',
                        position: index + 1,
                        name: item.name,
                        ...(item.path && index < trail.length - 1
                            ? { item: `${siteUrl}${item.path}`.replace(/([^:])\/\//g, '$1/').replace(/\/$/, '') || siteUrl }
                            : {}),
                    })),
                })
            }),
        }],
    })
}
