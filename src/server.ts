import express from 'express';
import { ExpressAdapter } from 'ask-sdk-express-adapter';
import { skill } from './skill.js';
import { BusService } from './services/BusService.js';
import { SQLiteStorage } from './services/StorageService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const verifySignature = process.env.VERIFY_SIGNATURE === 'true';
const adapter = new ExpressAdapter(skill, verifySignature, verifySignature);

app.post('/', adapter.getRequestHandlers());

// Alexa+ Action SDK REST Endpoints
const busService = new BusService();
const storageService = new SQLiteStorage();

app.use(express.json());

// Serve the OpenAPI schema for Alexa+ discovery
app.use('/openapi.yaml', express.static(path.join(__dirname, '../openapi.yaml')));

app.get('/api/action/stop/:stopNumber', async (req, res) => {
    try {
        const stopNumber = parseInt(req.params.stopNumber, 10);
        if (isNaN(stopNumber)) {
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
        const stopNumber = parseInt(req.body.stopNumber, 10);
        if (isNaN(stopNumber)) {
            return res.status(400).json({ error: 'Invalid stop number in body' });
        }
        await storageService.saveStop(req.params.userId, stopNumber);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
