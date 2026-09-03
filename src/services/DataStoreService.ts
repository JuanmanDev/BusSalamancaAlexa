/**
 * Client for the Alexa Data Store REST API.
 *
 * A widget renders from a copy of the data held on the device itself; it never calls the skill.
 * To change what a widget shows, the skill pushes commands into that device data store from
 * outside any session, which is what this service does.
 *
 * https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/data-store-rest-api-reference.html
 */

/** Regional Alexa API endpoints. The skill is distributed in Spain, so Europe is the default. */
const API_ENDPOINTS = {
    NA: 'https://api.amazonalexa.com',
    EU: 'https://api.eu.amazonalexa.com',
    FE: 'https://api.fe.amazonalexa.com',
} as const;

const LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token';

/** Amazon caps data store writes at 25 TPS per skill and returns 429 above that. */
const MAX_DEVICES_PER_COMMAND = 20;

export interface DataStoreObject {
    namespace: string;
    key: string;
    content: Record<string, unknown>;
}

export interface PushResult {
    ok: boolean;
    /** Devices the payload reached, or that Alexa queued for delivery. */
    delivered: string[];
    /** Devices Alexa says will never come back; the caller should stop tracking them. */
    permanentlyUnavailable: string[];
    error?: string;
}

export class DataStoreService {
    private readonly clientId?: string;
    private readonly clientSecret?: string;
    private readonly endpoint: string;

    private accessToken?: string;
    private tokenExpiresAt = 0;

    constructor() {
        this.clientId = process.env.ALEXA_CLIENT_ID;
        this.clientSecret = process.env.ALEXA_CLIENT_SECRET;
        const region = (process.env.ALEXA_API_REGION || 'EU').toUpperCase() as keyof typeof API_ENDPOINTS;
        this.endpoint = API_ENDPOINTS[region] || API_ENDPOINTS.EU;
    }

    /** Without skill messaging credentials there is nothing to push with. */
    public get isConfigured(): boolean {
        return Boolean(this.clientId && this.clientSecret);
    }

    /**
     * Client-credentials token for the `alexa::datastore` scope. Tokens last an hour; this keeps
     * one in memory and renews it a minute early rather than asking for one per push.
     */
    private async getAccessToken(): Promise<string> {
        if (this.accessToken && Date.now() < this.tokenExpiresAt) {
            return this.accessToken;
        }
        if (!this.isConfigured) {
            throw new Error('ALEXA_CLIENT_ID / ALEXA_CLIENT_SECRET are not set');
        }

        const body = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: this.clientId!,
            client_secret: this.clientSecret!,
            scope: 'alexa::datastore',
        });

        const response = await fetch(LWA_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });

        if (!response.ok) {
            throw new Error(`LWA token request failed: ${response.status} ${await response.text()}`);
        }

        const json = await response.json() as { access_token: string; expires_in: number };
        this.accessToken = json.access_token;
        this.tokenExpiresAt = Date.now() + (json.expires_in - 60) * 1000;
        return this.accessToken;
    }

    /**
     * Writes one object into the data store of up to 20 devices.
     *
     * `attemptDeliveryUntil` lets Alexa hold the payload for a device that is offline; there is
     * no point holding an arrival time past its own freshness, so callers pass a short deadline.
     */
    public async putObject(deviceIds: string[], object: DataStoreObject, attemptDeliveryUntil?: Date): Promise<PushResult> {
        if (deviceIds.length === 0) {
            return { ok: true, delivered: [], permanentlyUnavailable: [] };
        }
        if (deviceIds.length > MAX_DEVICES_PER_COMMAND) {
            throw new Error(`A single command targets at most ${MAX_DEVICES_PER_COMMAND} devices, got ${deviceIds.length}`);
        }

        const token = await this.getAccessToken();
        const response = await fetch(`${this.endpoint}/v1/datastore/commands`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                commands: [{
                    type: 'PUT_OBJECT',
                    namespace: object.namespace,
                    key: object.key,
                    content: object.content,
                }],
                target: { type: 'DEVICES', items: deviceIds },
                ...(attemptDeliveryUntil ? { attemptDeliveryUntil: attemptDeliveryUntil.toISOString() } : {}),
            }),
        });

        const text = await response.text();
        if (!response.ok) {
            return {
                ok: false,
                delivered: [],
                permanentlyUnavailable: [],
                error: `${response.status} ${text}`,
            };
        }

        // A 200 reports per-device outcomes: SUCCESS went through, DEVICE_UNAVAILABLE was queued,
        // and DEVICE_PERMANENTLY_UNAVAILABLE means the device is gone for good.
        const delivered: string[] = [];
        const permanentlyUnavailable: string[] = [];
        try {
            const json = JSON.parse(text) as { results?: { type?: string; device?: { deviceId?: string } }[] };
            for (const result of json.results ?? []) {
                const deviceId = result.device?.deviceId;
                if (!deviceId) continue;
                if (result.type === 'DEVICE_PERMANENTLY_UNAVAILABLE') {
                    permanentlyUnavailable.push(deviceId);
                } else {
                    delivered.push(deviceId);
                }
            }
        } catch {
            // An empty or unparseable 200 body still means the command was accepted.
        }

        return {
            ok: true,
            delivered: delivered.length ? delivered : deviceIds.filter(d => !permanentlyUnavailable.includes(d)),
            permanentlyUnavailable,
        };
    }
}
