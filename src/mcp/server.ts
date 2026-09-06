import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BusLine, BusStop, WebApiClient, decodeEntities } from '../services/WebApiClient.js';

/**
 * MCP server exposing Salamanca's real-time bus data.
 *
 * Any MCP host — Claude, an editor, an agent — can ask when the next bus reaches a stop. The
 * data comes from the web app's API rather than SIRI directly, so these tools share the same
 * coalesced call per stop as the website and the Echo Show widget.
 *
 * Tools return both human-readable text and `structuredContent`, so a model can read the prose
 * and a program can read the fields.
 */

const SERVER_NAME = 'bus-salamanca';
const SERVER_VERSION = '1.0.0';

/** Long stop and line lists are useless to a model in full; these keep answers legible. */
const MAX_STOP_MATCHES = 25;
const MAX_ARRIVALS = 10;

/**
 * Salamanca de Transportes answers 200 with nothing when it is unwell, so a tool that reported
 * "no buses due" would be stating something it does not know. Every tool says this instead.
 */
const SERVICE_UNAVAILABLE_TEXT =
    'No se puede consultar el estado de los autobuses ahora mismo: el servicio de Salamanca de '
    + 'Transportes (SIRI) no responde. Vuelve a intentarlo en unos minutos.';

function unavailable() {
    return {
        content: [{ type: 'text' as const, text: SERVICE_UNAVAILABLE_TEXT }],
        structuredContent: { serviceAvailable: false },
        isError: true,
    };
}

/**
 * Any failure to reach the data is the same thing from the caller's side, whether it arrives as
 * a 503, a 502 or a refused connection — and "GET /api/bus/stops -> 502" is not an answer to
 * give someone asking about a bus. The real error is logged for whoever maintains this.
 */
function unavailableBecause(tool: string, error: unknown) {
    console.error(`[mcp] ${tool} could not reach the bus data:`, error);
    return unavailable();
}

/** Accent- and case-insensitive matching, so "zurguen" finds "ZURGUÉN". */
function normalise(text: string): string {
    return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

function formatArrivalLine(a: { lineId: string; destination: string; minutesRemaining: number; isEstimate: boolean }): string {
    const when = a.minutesRemaining < 1 ? 'llegando' : `${a.minutesRemaining} min`;
    const towards = a.destination ? ` → ${a.destination}` : '';
    const estimated = a.isEstimate ? ' (estimado)' : '';
    return `Línea ${a.lineId}${towards}: ${when}${estimated}`;
}

function lineSummary(line: BusLine): string {
    const directions = (line.directions ?? []).map(d => decodeEntities(d.name)).join(' | ');
    return `Línea ${line.id}: ${decodeEntities(line.name)}${directions ? ` — ${directions}` : ''}`;
}

function stopSummary(stop: BusStop): string {
    const lines = stop.lines?.length ? ` (líneas ${stop.lines.join(', ')})` : '';
    return `Parada ${stop.id}: ${stop.name}${lines}`;
}

/**
 * Builds a server instance. In stateless HTTP mode one is created per request, so this must stay
 * cheap — the client it closes over holds the only cached state, and is shared.
 */
export function createMcpServer(api: WebApiClient): McpServer {
    const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

    server.registerTool(
        'get_stop_arrivals',
        {
            title: 'Next buses at a stop',
            description:
                'Real-time arrivals for a bus stop in Salamanca, Spain. Returns the lines due, '
                + 'their destination and how many minutes away they are. Stop numbers are the ones '
                + 'printed at the stop; use search_stops to find one by name.',
            inputSchema: {
                stopNumber: z.union([z.number().int().positive(), z.string()])
                    .describe('The stop number, e.g. 199'),
            },
        },
        async ({ stopNumber }) => {
            let arrivals, stopName;
            try {
                [arrivals, stopName] = await Promise.all([
                    api.getArrivals(stopNumber),
                    api.getStopName(stopNumber),
                ]);
            } catch (error) {
                return unavailableBecause('get_stop_arrivals', error);
            }

            // No arrivals and no stop name is the service being silent, not the stop being quiet.
            if (!arrivals.length && !stopName) return unavailable();

            const shown = arrivals.slice(0, MAX_ARRIVALS);
            const header = `Parada ${stopNumber}${stopName ? ` — ${stopName}` : ''}`;
            const body = shown.length
                ? shown.map(formatArrivalLine).join('\n')
                : 'No hay autobuses previstos ahora mismo. Fuera del horario de servicio esto es normal.';

            return {
                content: [{ type: 'text', text: `${header}\n${body}` }],
                structuredContent: {
                    stopNumber: String(stopNumber),
                    stopName,
                    arrivals: shown,
                },
            };
        },
    );

    server.registerTool(
        'search_stops',
        {
            title: 'Find a bus stop',
            description:
                'Search Salamanca bus stops by name or street, or look one up by number. Returns '
                + 'stop numbers to pass to get_stop_arrivals. Matching ignores accents and case.',
            inputSchema: {
                query: z.string().min(1).describe('Part of a stop name or street, or a stop number'),
                limit: z.number().int().min(1).max(MAX_STOP_MATCHES).optional()
                    .describe(`Maximum results (default ${MAX_STOP_MATCHES})`),
            },
        },
        async ({ query, limit }) => {
            let stops;
            try {
                stops = await api.getStops();
            } catch (error) {
                return unavailableBecause('search_stops', error);
            }
            const needle = normalise(query);
            const matches = stops
                .filter(s => normalise(s.name).includes(needle) || String(s.id) === query.trim())
                .slice(0, limit ?? MAX_STOP_MATCHES);

            const text = matches.length
                ? matches.map(stopSummary).join('\n')
                : `No hay paradas que coincidan con "${query}".`;

            return {
                content: [{ type: 'text', text }],
                structuredContent: { query, count: matches.length, stops: matches },
            };
        },
    );

    server.registerTool(
        'list_lines',
        {
            title: 'List bus lines',
            description: 'All urban bus lines in Salamanca, with their route names and directions.',
            inputSchema: {},
        },
        async () => {
            let lines;
            try {
                lines = await api.getLines();
            } catch (error) {
                return unavailableBecause('list_lines', error);
            }
            return {
                content: [{ type: 'text', text: lines.map(lineSummary).join('\n') }],
                structuredContent: {
                    count: lines.length,
                    lines: lines.map(l => ({
                        id: l.id,
                        name: decodeEntities(l.name),
                        directions: (l.directions ?? []).map(d => decodeEntities(d.name)),
                    })),
                },
            };
        },
    );

    server.registerTool(
        'get_line_stops',
        {
            title: 'Stops along a line',
            description:
                'The ordered stops of one bus line, per direction, with stop numbers and names. '
                + 'Use it to find which stop to catch a given line at.',
            inputSchema: {
                lineId: z.string().min(1).describe('The line number, e.g. "2"'),
            },
        },
        async ({ lineId }) => {
            let lines, stops;
            try {
                [lines, stops] = await Promise.all([api.getLines(), api.getStops()]);
            } catch (error) {
                return unavailableBecause('get_line_stops', error);
            }
            const line = lines.find(l => String(l.id) === lineId.trim());

            if (!line) {
                return {
                    content: [{ type: 'text', text: `No existe la línea "${lineId}".` }],
                    structuredContent: { found: false, lineId },
                    isError: true,
                };
            }

            const nameById = new Map(stops.map(s => [String(s.id), s.name]));
            const directions = (line.directions ?? []).map(direction => ({
                id: direction.id,
                name: decodeEntities(direction.name),
                stops: [...direction.stops]
                    .sort((a, b) => a.order - b.order)
                    .map(s => ({ id: String(s.id), name: nameById.get(String(s.id)) || '' })),
            }));

            const text = [
                lineSummary(line),
                ...directions.map(d =>
                    `\n${d.name}\n` + d.stops.map((s, i) => `  ${i + 1}. ${s.id} — ${s.name}`).join('\n')),
            ].join('\n');

            return {
                content: [{ type: 'text', text }],
                structuredContent: { found: true, lineId: String(line.id), name: decodeEntities(line.name), directions },
            };
        },
    );

    return server;
}
