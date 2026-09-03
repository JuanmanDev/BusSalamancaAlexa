import express from 'express';
import { ExpressAdapter } from 'ask-sdk-express-adapter';
import { skill } from './skill.js';
import { BusService } from './services/BusService.js';
import { SQLiteStorage } from './services/StorageService.js';
import { DataStoreService } from './services/DataStoreService.js';
import { WidgetRefresher } from './services/WidgetRefresher.js';
import { WebApiClient } from './services/WebApiClient.js';
import { createMcpServer } from './mcp/server.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');

const verifySignature = process.env.VERIFY_SIGNATURE !== 'false'; // secure by default
if (!verifySignature) {
    console.warn('[server] VERIFY_SIGNATURE=false → Alexa request signature/timestamp validation is DISABLED. Only use locally.');
}
const adapter = new ExpressAdapter(skill, verifySignature, verifySignature);

// Alexa Skills Kit endpoint. Must be registered BEFORE express.json() so the adapter
// can read the raw body for signature verification.
app.post('/', adapter.getRequestHandlers());
app.post('/alexa', adapter.getRequestHandlers());

// Health check (Docker / reverse proxy)
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Alexa+ Action SDK style REST endpoints (plain JSON, described by openapi.yaml)
// ---------------------------------------------------------------------------
const busService = new BusService();
const storageService = new SQLiteStorage();

app.use(express.json());

// Serve the OpenAPI schema for Alexa+ / agent discovery
const openapiPath = [path.join(__dirname, '../openapi.yaml'), path.join(process.cwd(), 'openapi.yaml')].find(p => fs.existsSync(p));
app.get('/openapi.yaml', (_req, res) => {
    if (!openapiPath) return res.status(404).send('openapi.yaml not found');
    res.type('application/yaml').sendFile(openapiPath);
});

app.get('/api/action/stop/:stopNumber', async (req, res) => {
    try {
        const stopNumber = parseInt(req.params.stopNumber, 10);
        if (isNaN(stopNumber) || stopNumber <= 0) {
            return res.status(400).json({ error: 'Invalid stop number' });
        }
        const data = await busService.getStopInfo(stopNumber);
        if (typeof data === 'string') {
            return res.json({ linesText: data, stopData: { address: '', number: stopNumber.toString() }, arrivalData: [] });
        }
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/action/user/:userId/stop', async (req, res) => {
    try {
        const stopNumber = await storageService.getStop(req.params.userId);
        res.json({ stopNumber: stopNumber || null });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/action/user/:userId/stop', async (req, res) => {
    try {
        const stopNumber = parseInt(req.body?.stopNumber, 10);
        if (isNaN(stopNumber) || stopNumber <= 0) {
            return res.status(400).json({ error: 'Invalid stop number in body' });
        }
        await storageService.saveStop(req.params.userId, stopNumber);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ---------------------------------------------------------------------------
// MCP server — the same bus data, for any MCP host (Claude, editors, agents)
//
// Stateless: a server and transport per request, with no session to resume. The tools are
// read-only lookups, so there is nothing to keep between calls, and every instance is cheap.
// The WebApiClient is shared, because it holds the stop and line caches.
// ---------------------------------------------------------------------------
const mcpApi = new WebApiClient(process.env.WEB_API_URL || 'https://bussalamanca.juanman.tech');

app.post('/mcp', async (req, res) => {
    try {
        const mcpServer = createMcpServer(mcpApi);
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
        res.on('close', () => {
            void transport.close();
            void mcpServer.close();
        });
        await mcpServer.connect(transport);
        await transport.handleRequest(req, res, req.body);
    } catch (error) {
        console.error('[mcp] request failed', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: { code: -32603, message: 'Internal server error' },
                id: null,
            });
        }
    }
});

// Stateless mode has no stream to resume and no session to end.
for (const method of ['get', 'delete'] as const) {
    app[method]('/mcp', (_req, res) => {
        res.status(405).json({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Method not allowed: this MCP endpoint is stateless, use POST' },
            id: null,
        });
    });
}

// The Echo Show widget renders from the device's own data store, so keeping it current is a
// server-side push loop rather than anything the device asks for.
const widgetRefresher = new WidgetRefresher(storageService, new DataStoreService());

const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, () => {
    console.log(`Listening on port ${port} (signature verification: ${verifySignature ? 'on' : 'OFF'})`);
    widgetRefresher.start();
});

// Graceful shutdown for Docker (SIGTERM) so in-flight Alexa requests finish.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
        console.log(`[server] ${signal} received, shutting down…`);
        widgetRefresher.stop();
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 5000).unref();
    });
}
