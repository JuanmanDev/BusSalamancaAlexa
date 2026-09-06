import { loadStops } from './catalogues'

/**
 * Whether Salamanca de Transportes' SIRI service can be reached at all.
 *
 * SIRI does not fail loudly: when it is unwell it answers HTTP 200 with an empty body, which
 * looks exactly like "no buses are due at this stop right now". Those two things need very
 * different words in front of a user, so they need telling apart.
 *
 * The stop catalogue is the discriminator. It is static data that SIRI serves whenever it is
 * healthy, and the last good copy is kept on disk, so failing to produce one means the service
 * is genuinely unavailable rather than merely quiet.
 */

export interface ServiceStatus {
    available: boolean
    checkedAt: string
}

export async function getServiceStatus(): Promise<ServiceStatus> {
    let available = false
    try {
        available = (await loadStops()).length > 0
    } catch {
        available = false
    }
    return { available, checkedAt: new Date().toISOString() }
}

export async function isServiceAvailable(): Promise<boolean> {
    return (await getServiceStatus()).available
}
