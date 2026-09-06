import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Last-known-good storage for the stop and line catalogues.
 *
 * SIRI does not serve the catalogue outside bus service hours: `StopPointsDiscovery` answers
 * HTTP 200 with zero stops at, say, half past midnight. Caching that answer — which is what
 * `defineCachedEventHandler` did — pinned the emptiness for an hour (twelve for the sitemap),
 * and the effects were not subtle: stop pages lost the street name from their title, H1,
 * description and BusStop JSON-LD, and the sitemap shrank from ~390 URLs per locale to 12.
 * Search engines crawl at night.
 *
 * The catalogues are static in practice, so a good answer is kept in memory and on disk and
 * reused whenever a fetch comes back empty.
 */

const DATA_DIR = process.env.NUXT_DATA_DIR || '/data'
const DEFAULT_TTL_MS = 60 * 60 * 1000

interface Entry<T> {
    items: T[]
    fetchedAt: number
}

const memory = new Map<string, Entry<unknown>>()
/** Guards against a burst of requests all starting the same upstream call. */
const inFlight = new Map<string, Promise<unknown[]>>()

function snapshotPath(name: string): string {
    return join(DATA_DIR, `${name}.json`)
}

async function persist<T>(name: string, items: T[]): Promise<void> {
    try {
        await mkdir(DATA_DIR, { recursive: true })
        await writeFile(snapshotPath(name), JSON.stringify(items), 'utf-8')
    } catch (error) {
        // A missing or read-only data dir costs the disk fallback, nothing else.
        console.warn(`[reference] could not persist ${name}:`, (error as Error).message)
    }
}

async function restore<T>(name: string): Promise<T[]> {
    try {
        const raw = await readFile(snapshotPath(name), 'utf-8')
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed as T[] : []
    } catch {
        return []
    }
}

/**
 * Optional change tracking, so the sitemap can carry a `lastmod` that means something.
 *
 * A sitemap where every URL changed "today" tells search engines nothing and gets the field
 * ignored, so the date has to come from the content actually changing. `fingerprint` is
 * compared against the last one recorded for that id; the stored date only moves when it does.
 */
export interface ChangeTracking<T> {
    id: (item: T) => string
    fingerprint: (item: T) => string
}

interface ChangeRecord {
    fingerprint: string
    changedAt: string
}

type ChangeLog = Record<string, ChangeRecord>

const changeLogs = new Map<string, ChangeLog>()

async function readChangeLog(name: string): Promise<ChangeLog> {
    const held = changeLogs.get(name)
    if (held) return held

    try {
        const raw = await readFile(join(DATA_DIR, `${name}-lastmod.json`), 'utf-8')
        const parsed = JSON.parse(raw)
        const log: ChangeLog = parsed && typeof parsed === 'object' ? parsed : {}
        changeLogs.set(name, log)
        return log
    } catch {
        const empty: ChangeLog = {}
        changeLogs.set(name, empty)
        return empty
    }
}

async function updateChangeLog<T>(name: string, items: T[], tracking: ChangeTracking<T>): Promise<void> {
    const log = await readChangeLog(name)
    const now = new Date().toISOString()
    let changed = false

    for (const item of items) {
        const id = tracking.id(item)
        const fingerprint = tracking.fingerprint(item)
        const previous = log[id]
        if (!previous || previous.fingerprint !== fingerprint) {
            log[id] = { fingerprint, changedAt: now }
            changed = true
        }
    }

    // Entries that disappear from the catalogue are left alone: the page may still be indexed,
    // and inventing a change date for something that is simply gone helps nobody.
    if (!changed) return

    changeLogs.set(name, log)
    try {
        await mkdir(DATA_DIR, { recursive: true })
        await writeFile(join(DATA_DIR, `${name}-lastmod.json`), JSON.stringify(log), 'utf-8')
    } catch (error) {
        console.warn(`[reference] could not persist ${name} change log:`, (error as Error).message)
    }
}

/** When each entity's content last changed, by id. Missing ids simply have no `lastmod`. */
export async function getLastModified(name: string): Promise<Record<string, string>> {
    const log = await readChangeLog(name)
    return Object.fromEntries(Object.entries(log).map(([id, record]) => [id, record.changedAt]))
}

/**
 * Returns the catalogue, preferring a fresh fetch and falling back to the last good one.
 * An empty result is never treated as an answer worth keeping.
 */
export async function loadReference<T>(
    name: string,
    fetcher: () => Promise<T[]>,
    ttlMs = DEFAULT_TTL_MS,
    tracking?: ChangeTracking<T>,
): Promise<T[]> {
    const held = memory.get(name) as Entry<T> | undefined
    if (held && held.items.length && Date.now() - held.fetchedAt < ttlMs) {
        return held.items
    }

    const existing = inFlight.get(name) as Promise<T[]> | undefined
    if (existing) return await existing

    const pending = (async (): Promise<T[]> => {
        let fresh: T[] = []
        try {
            fresh = await fetcher()
        } catch (error) {
            console.warn(`[reference] ${name} fetch failed:`, (error as Error).message)
        }

        if (fresh.length) {
            memory.set(name, { items: fresh, fetchedAt: Date.now() })
            void persist(name, fresh)
            if (tracking) void updateChangeLog(name, fresh, tracking)
            return fresh
        }

        if (held?.items.length) {
            console.warn(`[reference] ${name} came back empty, serving the copy held in memory`)
            return held.items
        }

        const fromDisk = await restore<T>(name)
        if (fromDisk.length) {
            console.warn(`[reference] ${name} came back empty, serving the snapshot on disk`)
            // Deliberately not stamped as fresh: the next request retries the upstream.
            memory.set(name, { items: fromDisk, fetchedAt: 0 })
            // A restored catalogue still needs change dates — without this a server that only
            // ever serves the snapshot (a long outage, or a restart at night) would publish a
            // sitemap with no lastmod at all. First sighting stamps now and then stays put.
            if (tracking) void updateChangeLog(name, fromDisk, tracking)
            return fromDisk
        }

        console.warn(`[reference] ${name} is empty and no snapshot exists yet`)
        return []
    })().finally(() => inFlight.delete(name))

    inFlight.set(name, pending as Promise<unknown[]>)
    return await pending
}
