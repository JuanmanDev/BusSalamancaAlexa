/**
 * Reads arrivals from the Nuxt web app's API instead of calling SIRI directly.
 *
 * Both halves of this project watch the same stops: every open stop page polls arrivals every
 * 10 seconds and the widget refreshes every 30. Pointing the widget at the web API means one
 * shared SIRI call per stop rather than one per consumer, and the widget inherits what that
 * route already does — interpolating buses that briefly drop out of the SIRI feed, and falling
 * back to the last good answer when SIRI fails.
 *
 * Set WEB_API_URL to reach it. On the Oracle host both containers share the `traefik-public`
 * network, so `http://web:3000` skips the public hostname and TLS entirely.
 */

/** The widget tolerates a slow answer badly: a tick is 30s and the next one is close behind. */
const REQUEST_TIMEOUT_MS = 4000;

/** Stop names change about never, and the web route caches them for an hour anyway. */
const STOP_NAME_TTL_MS = 60 * 60 * 1000;

/** What the widget needs about a stop, whichever source produced it. */
export interface StopSnapshot {
    address: string;
    /** `line` stays a string: not every line reference is a number. */
    arrivals: { line: string; minutes: number }[];
}

interface WebArrival {
    lineId?: string;
    lineName?: string;
    minutesRemaining?: number;
    isEstimate?: boolean;
}

export class WebApiClient {
    private readonly baseUrl?: string;
    private stopNames = new Map<string, string>();
    private stopNamesFetchedAt = 0;

    constructor(baseUrl = process.env.WEB_API_URL) {
        this.baseUrl = baseUrl?.replace(/\/+$/, '') || undefined;
    }

    public get isConfigured(): boolean {
        return Boolean(this.baseUrl);
    }

    private async getJson<T>(path: string): Promise<T> {
        const response = await fetch(`${this.baseUrl}${path}`, {
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!response.ok) {
            throw new Error(`GET ${path} -> ${response.status}`);
        }
        return await response.json() as T;
    }

    /**
     * Stop names come from a separate, hour-cached route, so this holds them for an hour too
     * rather than pulling the whole stop list on every widget tick.
     */
    private async getStopName(stopNumber: number): Promise<string> {
        if (Date.now() - this.stopNamesFetchedAt > STOP_NAME_TTL_MS) {
            try {
                const stops = await this.getJson<{ id?: string; name?: string }[]>('/api/bus/stops');
                this.stopNames = new Map(stops.filter(s => s.id).map(s => [String(s.id), s.name || '']));
                this.stopNamesFetchedAt = Date.now();
            } catch (error) {
                // A missing name is cosmetic; the arrivals themselves matter more.
                console.warn('[webapi] could not refresh stop names', error);
            }
        }
        return this.stopNames.get(String(stopNumber)) || '';
    }

    public async getSnapshot(stopNumber: number): Promise<StopSnapshot> {
        const [raw, address] = await Promise.all([
            this.getJson<WebArrival[]>(`/api/bus/stop/${stopNumber}/arrivals`),
            this.getStopName(stopNumber),
        ]);

        const arrivals = raw
            .filter(a => typeof a.minutesRemaining === 'number')
            .map(a => ({
                // lineId is the line number ("9"); lineName is the route ("CAPUCHINOS - ZURGUÉN"),
                // which neither fits the widget's badge nor matches what the skill says aloud.
                line: String(a.lineId || a.lineName || '').trim(),
                minutes: a.minutesRemaining as number,
            }))
            .filter(a => a.line !== '');

        return { address, arrivals };
    }
}
