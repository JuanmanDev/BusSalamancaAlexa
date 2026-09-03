/**
 * Reads bus data from the Nuxt web app's API instead of calling SIRI directly.
 *
 * Everything that watches a stop — every open stop page, the Echo Show widget, the MCP server —
 * goes through the same route, which coalesces callers per stop, so one SIRI call serves all of
 * them. Callers here also inherit what that route adds: interpolation of buses that briefly drop
 * out of the SIRI feed, and a fallback to the last good answer when SIRI fails.
 *
 * Set WEB_API_URL to reach it. On the Oracle host both containers share the `traefik-public`
 * network, so `http://web:3000` skips the public hostname and TLS entirely.
 */

/** The widget tolerates a slow answer badly: a tick is 30s and the next one is close behind. */
const REQUEST_TIMEOUT_MS = 4000;

/** Stops and lines change about never, and the web routes cache them for an hour anyway. */
const REFERENCE_TTL_MS = 60 * 60 * 1000;

/** What the widget needs about a stop, whichever source produced it. */
export interface StopSnapshot {
    address: string;
    /** `line` stays a string: not every line reference is a number. */
    arrivals: { line: string; minutes: number }[];
}

export interface BusStop {
    id: string;
    name: string;
    latitude?: number;
    longitude?: number;
    lines: string[];
}

export interface BusLineDirection {
    id: string;
    name: string;
    stops: { id: string; order: number }[];
}

export interface BusLine {
    id: string;
    name: string;
    destination?: string;
    directions?: BusLineDirection[];
}

export interface StopArrival {
    lineId: string;
    lineName: string;
    destination: string;
    minutesRemaining: number;
    expectedArrivalTime: string;
    isEstimate: boolean;
}

interface WebArrival {
    lineId?: string;
    lineName?: string;
    destination?: string;
    expectedArrivalTime?: string;
    minutesRemaining?: number;
    isEstimate?: boolean;
}

/** SIRI line and direction names arrive HTML-escaped ("Chinchibarra &gt; Buenos Aires"). */
export function decodeEntities(text: string): string {
    return text
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
}

/** Holds a value for a while so repeated calls do not re-pull a list that never changes. */
class Cached<T> {
    private value?: T;
    private fetchedAt = 0;

    constructor(private readonly load: () => Promise<T>, private readonly ttlMs: number) { }

    async get(): Promise<T> {
        if (this.value !== undefined && Date.now() - this.fetchedAt < this.ttlMs) {
            return this.value;
        }
        const fresh = await this.load();
        this.value = fresh;
        this.fetchedAt = Date.now();
        return fresh;
    }

    /** The last value held, however old — used when a refresh fails but stale data still helps. */
    get stale(): T | undefined {
        return this.value;
    }
}

export class WebApiClient {
    private readonly baseUrl?: string;
    private readonly stops: Cached<BusStop[]>;
    private readonly lines: Cached<BusLine[]>;

    constructor(baseUrl = process.env.WEB_API_URL) {
        this.baseUrl = baseUrl?.replace(/\/+$/, '') || undefined;
        this.stops = new Cached(() => this.getJson<BusStop[]>('/api/bus/stops'), REFERENCE_TTL_MS);
        this.lines = new Cached(() => this.getJson<BusLine[]>('/api/bus/lines'), REFERENCE_TTL_MS);
    }

    public get isConfigured(): boolean {
        return Boolean(this.baseUrl);
    }

    private async getJson<T>(path: string): Promise<T> {
        if (!this.baseUrl) throw new Error('WEB_API_URL is not set');
        const response = await fetch(`${this.baseUrl}${path}`, {
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!response.ok) {
            throw new Error(`GET ${path} -> ${response.status}`);
        }
        return await response.json() as T;
    }

    public async getStops(): Promise<BusStop[]> {
        return await this.stops.get();
    }

    public async getLines(): Promise<BusLine[]> {
        return await this.lines.get();
    }

    public async getStopName(stopNumber: number | string): Promise<string> {
        try {
            const stops = await this.getStops();
            return stops.find(s => String(s.id) === String(stopNumber))?.name || '';
        } catch (error) {
            // A missing name is cosmetic; the arrivals themselves matter more.
            const stale = this.stops.stale;
            if (stale) return stale.find(s => String(s.id) === String(stopNumber))?.name || '';
            console.warn('[webapi] could not resolve stop name', error);
            return '';
        }
    }

    /** Full arrival detail, for callers that can use more than a line number and a countdown. */
    public async getArrivals(stopNumber: number | string): Promise<StopArrival[]> {
        const raw = await this.getJson<WebArrival[]>(`/api/bus/stop/${stopNumber}/arrivals`);
        return raw
            .filter(a => typeof a.minutesRemaining === 'number')
            .map(a => ({
                lineId: String(a.lineId || ''),
                lineName: decodeEntities(String(a.lineName || '')),
                destination: decodeEntities(String(a.destination || '')),
                minutesRemaining: a.minutesRemaining as number,
                expectedArrivalTime: String(a.expectedArrivalTime || ''),
                isEstimate: Boolean(a.isEstimate),
            }));
    }

    public async getSnapshot(stopNumber: number): Promise<StopSnapshot> {
        const [arrivals, address] = await Promise.all([
            this.getArrivals(stopNumber),
            this.getStopName(stopNumber),
        ]);

        return {
            address,
            arrivals: arrivals
                // lineId is the line number ("9"); lineName is the route ("CAPUCHINOS - ZURGUÉN"),
                // which neither fits the widget's badge nor matches what the skill says aloud.
                .map(a => ({ line: a.lineId || a.lineName, minutes: a.minutesRemaining }))
                .filter(a => a.line !== ''),
        };
    }
}
