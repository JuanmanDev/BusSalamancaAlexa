import { BusService } from './BusService.js';
import { DataStoreService } from './DataStoreService.js';
import { IStorageService, WidgetDevice } from './StorageService.js';
import { StopSnapshot, WebApiClient } from './WebApiClient.js';
import { createHash } from 'crypto';

/**
 * Keeps the Echo Show widget current.
 *
 * A widget never calls the skill: it renders whatever sits in the device's own data store. So
 * "refreshes every 30 seconds" means this loop pushes to every device that has the widget
 * installed, every 30 seconds.
 *
 * Two things that would otherwise go wrong are handled here:
 *
 * - SIRI is a third-party service and the only source of arrival times. Polling it once per
 *   device would multiply load by the number of installs, so a tick fetches each *distinct stop*
 *   once and shares the answer between everyone watching that stop. When WEB_API_URL is set
 *   the fetch goes through the web app's arrivals route, which already coalesces callers per
 *   stop, so the widget and everyone reading the site share one SIRI call instead of two.
 * - Buses do not run all night, and pushing "no arrivals" every 30 seconds until 6am spends
 *   SIRI calls and device wake-ups on nothing. Outside service hours the loop idles.
 */

export const WIDGET_NAMESPACE = 'BusSalamanca';
export const WIDGET_KEY = 'stop';
export const WIDGET_PACKAGE_ID = 'BusSalamancaWidget';

/** Arrival times age out fast; a payload Alexa could not deliver within a tick is worthless. */
const DELIVERY_DEADLINE_MS = 2 * 60 * 1000;

const MAX_DEVICES_PER_COMMAND = 20;
const MAX_ARRIVALS_SHOWN = 4;

export type WidgetStatus = 'ok' | 'no-stop' | 'no-arrivals' | 'unavailable' | 'error';

export interface WidgetContent extends Record<string, unknown> {
    status: WidgetStatus;
    stopNumber: string;
    stopName: string;
    arrivals: { line: string; minutes: number; label: string }[];
    message: string;
    /** "23:41" in Salamanca time — the widget has no way to format a timestamp itself. */
    updatedLabel: string;
    updatedAt: string;
}

interface ActiveHours {
    from: number;
    to: number;
}

function parseActiveHours(raw: string | undefined): ActiveHours {
    const match = /^(\d{1,2})-(\d{1,2})$/.exec((raw || '').trim());
    if (!match) return { from: 6, to: 24 };
    return { from: Number(match[1]), to: Number(match[2]) };
}

/** Current hour in Salamanca, which is what the timetable is in. */
function madridHour(): number {
    return Number(new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Madrid',
        hour: '2-digit',
        hour12: false,
    }).format(new Date()));
}

function madridTimeLabel(): string {
    return new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(new Date());
}

export class WidgetRefresher {
    private readonly busService = new BusService();
    private readonly webApi = new WebApiClient();
    private readonly intervalMs: number;
    private readonly activeHours: ActiveHours;
    private timer?: NodeJS.Timeout;
    private ticking = false;

    constructor(
        private readonly storage: IStorageService,
        private readonly dataStore: DataStoreService,
    ) {
        this.intervalMs = Number(process.env.WIDGET_REFRESH_MS) || 30_000;
        this.activeHours = parseActiveHours(process.env.WIDGET_ACTIVE_HOURS);
    }

    public start(): void {
        if (!this.dataStore.isConfigured) {
            console.log('[widget] ALEXA_CLIENT_ID / ALEXA_CLIENT_SECRET not set → widget refresh disabled');
            return;
        }
        const source = this.webApi.isConfigured ? 'web API (shared cache)' : 'SIRI directly';
        console.log(`[widget] refreshing every ${this.intervalMs / 1000}s between ${this.activeHours.from}:00 and ${this.activeHours.to}:00 Europe/Madrid, arrivals from ${source}`);
        this.timer = setInterval(() => { void this.tick(); }, this.intervalMs);
        this.timer.unref();
        void this.tick();
    }

    public stop(): void {
        if (this.timer) clearInterval(this.timer);
        this.timer = undefined;
    }

    private isWithinServiceHours(): boolean {
        const hour = madridHour();
        const { from, to } = this.activeHours;
        // A window like 6-24 is a plain range; one like 22-2 wraps past midnight.
        return from <= to ? hour >= from && hour < to : hour >= from || hour < to;
    }

    /** One refresh pass. Never runs concurrently with itself: a slow SIRI must not stack ticks. */
    public async tick(): Promise<void> {
        if (this.ticking) return;
        if (!this.isWithinServiceHours()) return;

        this.ticking = true;
        try {
            const devices = await this.storage.getWidgetDevices();
            if (devices.length === 0) return;

            const stopInfo = await this.fetchDistinctStops(devices);
            await this.pushToDevices(devices, stopInfo);
        } catch (error) {
            console.error('[widget] refresh failed', error);
        } finally {
            this.ticking = false;
        }
    }

    /** One lookup per distinct stop, however many devices are watching it. */
    private async fetchDistinctStops(devices: WidgetDevice[]): Promise<Map<number, StopSnapshot | null>> {
        const stops = [...new Set(devices.map(d => d.stopNumber).filter((s): s is number => typeof s === 'number'))];
        const results = new Map<number, StopSnapshot | null>();

        await Promise.all(stops.map(async (stop) => {
            results.set(stop, await this.fetchStop(stop));
        }));

        return results;
    }

    /**
     * Prefers the web app's arrivals route, which shares one SIRI call per stop with the site and
     * adds its interpolation of buses that briefly drop out of the feed. Falls back to calling
     * SIRI directly, so the widget keeps working when the web container is down or WEB_API_URL is
     * not set.
     */
    private async fetchStop(stop: number): Promise<StopSnapshot | null> {
        if (this.webApi.isConfigured) {
            try {
                return await this.webApi.getSnapshot(stop);
            } catch (error) {
                console.warn(`[widget] web API lookup failed for stop ${stop}, falling back to SIRI`, error);
            }
        }

        try {
            const info = await this.busService.getStopInfo(stop);
            // BusService answers with a plain string when it has nothing for the stop.
            if (typeof info === 'string' || !info) return { address: '', arrivals: [] };
            return {
                address: info.stopData.address || '',
                arrivals: info.arrivalData.map(a => ({ line: String(a.line), minutes: a.minutesRemaining })),
            };
        } catch (error) {
            console.error(`[widget] SIRI lookup failed for stop ${stop}`, error);
            return null;
        }
    }

    private async pushToDevices(devices: WidgetDevice[], stopInfo: Map<number, StopSnapshot | null>): Promise<void> {
        // Devices showing identical content can travel in one command, so group by payload.
        const batches = new Map<string, { content: WidgetContent; deviceIds: string[] }>();

        for (const device of devices) {
            const content = this.buildContent(device, stopInfo);
            const hash = hashContent(content);
            // Skip a device whose visible content has not moved since the last push.
            if (device.lastPushHash === hash) continue;

            const batch = batches.get(hash) ?? { content, deviceIds: [] };
            batch.deviceIds.push(device.deviceId);
            batches.set(hash, batch);
        }

        if (batches.size === 0) return;

        const deadline = new Date(Date.now() + DELIVERY_DEADLINE_MS);
        let pushed = 0;

        for (const [hash, batch] of batches) {
            for (let i = 0; i < batch.deviceIds.length; i += MAX_DEVICES_PER_COMMAND) {
                const chunk = batch.deviceIds.slice(i, i + MAX_DEVICES_PER_COMMAND);
                const result = await this.dataStore.putObject(
                    chunk,
                    { namespace: WIDGET_NAMESPACE, key: WIDGET_KEY, content: batch.content },
                    deadline,
                );

                if (!result.ok) {
                    console.error(`[widget] push failed for ${chunk.length} device(s): ${result.error}`);
                    continue;
                }

                // Only remember the hash for devices that took it, so a failed push retries.
                await Promise.all(result.delivered.map(id => this.storage.setWidgetPushHash(id, hash)));
                // A device Alexa calls permanently unavailable is never coming back.
                await Promise.all(result.permanentlyUnavailable.map(id => {
                    console.log(`[widget] dropping permanently unavailable device ${id}`);
                    return this.storage.removeWidgetDevice(id, WIDGET_PACKAGE_ID);
                }));
                pushed += result.delivered.length;
            }
        }

        if (pushed > 0) console.log(`[widget] pushed to ${pushed} device(s)`);
    }

    /** Turns a stop snapshot into exactly the fields the widget document binds to. */
    private buildContent(device: WidgetDevice, stopInfo: Map<number, StopSnapshot | null>): WidgetContent {
        const updatedAt = new Date().toISOString();
        const updatedLabel = madridTimeLabel();

        if (typeof device.stopNumber !== 'number') {
            return {
                status: 'no-stop',
                stopNumber: '',
                stopName: '',
                arrivals: [],
                message: 'Di "Alexa, dile a Bus Salamanca que guarde la parada 199" para ver tu parada aquí.',
                updatedLabel,
                updatedAt,
            };
        }

        const snapshot = stopInfo.get(device.stopNumber);
        const stopNumber = String(device.stopNumber);

        // null means every source failed, so Salamanca de Transportes cannot be reached. Showing
        // "no buses due" on a screen someone glances at on their way out would be a lie.
        if (!snapshot) {
            return {
                status: 'unavailable',
                stopNumber,
                stopName: '',
                arrivals: [],
                message: 'No se puede consultar el estado de los autobuses ahora mismo.',
                updatedLabel,
                updatedAt,
            };
        }

        // The web API answers with an empty snapshot both when a stop is quiet and when SIRI is
        // down; a healthy service still names the stop, so a nameless empty answer is an outage.
        if (!snapshot.arrivals.length && !snapshot.address) {
            return {
                status: 'unavailable',
                stopNumber,
                stopName: '',
                arrivals: [],
                message: 'No se puede consultar el estado de los autobuses ahora mismo.',
                updatedLabel,
                updatedAt,
            };
        }

        const arrivals = snapshot.arrivals.slice(0, MAX_ARRIVALS_SHOWN).map(a => ({
            line: a.line,
            minutes: a.minutes,
            label: a.minutes < 2 ? '<1 min' : `${a.minutes} min`,
        }));

        return {
            status: arrivals.length ? 'ok' : 'no-arrivals',
            stopNumber,
            stopName: snapshot.address,
            arrivals,
            message: arrivals.length ? '' : 'Sin autobuses previstos ahora mismo.',
            updatedLabel,
            updatedAt,
        };
    }
}

/**
 * Hash of everything the widget actually shows. The timestamps are deliberately excluded:
 * including them would make every payload unique and defeat the point of skipping unchanged
 * pushes. The label a device ends up showing is therefore the time its content last changed,
 * which is the useful reading of "updated" anyway.
 */
function hashContent(content: WidgetContent): string {
    const { updatedAt, updatedLabel, ...visible } = content;
    return createHash('sha1').update(JSON.stringify(visible)).digest('hex');
}
