/**
 * Local smoke test for the Alexa endpoint.
 * Start the server first with signature verification disabled:
 *   VERIFY_SIGNATURE=false npm run dev      (or: node dist/server.js)
 * Then: npm run test:local
 */
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000/';

function envelope(request, { newSession = true, sessionAttributes = {}, apl = false } = {}) {
    return {
        version: '1.0',
        session: {
            new: newSession,
            sessionId: 'amzn1.echo-api.session.test',
            application: { applicationId: 'amzn1.ask.skill.test' },
            attributes: sessionAttributes,
            user: { userId: 'amzn1.ask.account.TEST' }
        },
        context: {
            System: {
                application: { applicationId: 'amzn1.ask.skill.test' },
                user: { userId: 'amzn1.ask.account.TEST' },
                device: { supportedInterfaces: apl ? { 'Alexa.Presentation.APL': {} } : {} }
            }
        },
        request: {
            requestId: 'amzn1.echo-api.request.test',
            timestamp: new Date().toISOString(),
            locale: 'es-ES',
            ...request
        }
    };
}

function intent(name, slots = {}) {
    return {
        type: 'IntentRequest',
        intent: {
            name,
            confirmationStatus: 'NONE',
            slots: Object.fromEntries(Object.entries(slots).map(([k, v]) => [k, { name: k, value: v, confirmationStatus: 'NONE' }]))
        }
    };
}

const CASES = [
    ['LaunchRequest (no saved stop → asks for a number)', envelope({ type: 'LaunchRequest' })],
    ['CheckAnyStopIntent digits', envelope(intent('CheckAnyStopIntent', { stopNumber: '199' }), { apl: true })],
    ['CheckAnyStopIntent Spanish words (Alexa+ style)', envelope(intent('CheckAnyStopIntent', { stopNumber: 'ciento noventa y nueve' }))],
    ['CheckAnyStopIntent unresolved slot ("?")', envelope(intent('CheckAnyStopIntent', { stopNumber: '?' }))],
    ['StopNumberOnlyIntent after pending check', envelope(intent('StopNumberOnlyIntent', { stopNumber: 'la 45' }), { newSession: false, sessionAttributes: { pendingAction: 'check' } })],
    ['CheckMyStopIntent', envelope(intent('CheckMyStopIntent'))],
    ['AMAZON.HelpIntent', envelope(intent('AMAZON.HelpIntent'))],
    ['AMAZON.FallbackIntent', envelope(intent('AMAZON.FallbackIntent'))],
    ['Unknown intent', envelope(intent('SomethingNewFromAlexaPlus'))],
    ['AMAZON.StopIntent', envelope(intent('AMAZON.StopIntent'))],
    ['CanFulfillIntentRequest YES', envelope({ type: 'CanFulfillIntentRequest', intent: { name: 'CheckAnyStopIntent', slots: { stopNumber: { name: 'stopNumber', value: '199' } } } })],
    ['CanFulfillIntentRequest NO (unknown intent)', envelope({ type: 'CanFulfillIntentRequest', intent: { name: 'OrderPizzaIntent', slots: {} } })],
    ['SessionEndedRequest', envelope({ type: 'SessionEndedRequest', reason: 'USER_INITIATED' })],
];

let failed = 0;
for (const [label, body] of CASES) {
    try {
        const res = await fetch(BASE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        const speech = data?.response?.outputSpeech?.ssml ?? data?.response?.outputSpeech?.text ?? '';
        const canFulfill = data?.response?.canFulfillIntent?.canFulfill;
        const ok = res.status === 200;
        if (!ok) failed++;
        console.log(`${ok ? '✅' : '❌'} ${label}`);
        console.log(`   status=${res.status} endSession=${data?.response?.shouldEndSession} directives=${(data?.response?.directives ?? []).map(d => d.type).join(',') || '-'}${canFulfill ? ` canFulfill=${canFulfill}` : ''}`);
        if (speech) console.log(`   speech: ${speech.replace(/<\/?speak>/g, '').slice(0, 160)}`);
    } catch (error) {
        failed++;
        console.log(`❌ ${label}\n   ${error.message}`);
    }
}
console.log(failed ? `\n${failed} case(s) failed` : '\nAll cases responded with HTTP 200');
process.exit(failed ? 1 : 0);
