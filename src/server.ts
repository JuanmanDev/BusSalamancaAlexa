import express from 'express';
import { ExpressAdapter } from 'ask-sdk-express-adapter';
import { skill } from './skill.js';

const app = express();
const verifySignature = process.env.VERIFY_SIGNATURE === 'true';
const adapter = new ExpressAdapter(skill, verifySignature, verifySignature);

app.post('/', adapter.getRequestHandlers());

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
