import { HandlerInput, RequestHandler, RequestInterceptor, ResponseInterceptor } from 'ask-sdk-core';
import { Response, canfulfill } from 'ask-sdk-model';
import * as Alexa from 'ask-sdk-core';
import { BusService } from '../services/BusService.js';
import { IStorageService } from '../services/StorageService.js';
import { APLUtils } from '../utils/APLUtils.js';
import { parseStopNumber } from '../utils/StopNumberParser.js';
import { WIDGET_PACKAGE_ID } from '../services/WidgetRefresher.js';

const busService = new BusService();

const CARD_IMAGE_SMALL = "https://m.media-amazon.com/images/I/41E21ldSofL.png";
const CARD_IMAGE_LARGE = "https://bussalamanca.s3.eu-west-1.amazonaws.com/publicimages/BusSalamancaBackground.png";
const WEB_URL = "bussalamanca.juanman.tech";

/** Intents that carry a stopNumber slot and that we can fulfil name-free (CanFulfillIntentRequest). */
const FULFILLABLE_INTENTS = new Set(['CheckAnyStopIntent', 'AddStopIntent', 'CheckStopIntent', 'CheckMyStopIntent', 'StopNumberOnlyIntent']);

type PendingAction = 'check' | 'save';

interface SessionAttrs {
    lastSpeech?: string;
    pendingAction?: PendingAction;
}

function randomStop(): number {
    return Math.floor(Math.random() * 250) + 1;
}

export class Handlers {
    constructor(private storageService: IStorageService) { }

    // ---------------------------------------------------------------------
    // Interceptors
    // ---------------------------------------------------------------------

    /** Logs every incoming request. Very useful to see what Alexa+ actually sends. */
    public LoggingRequestInterceptor: RequestInterceptor = {
        process: (handlerInput: HandlerInput) => {
            const req = handlerInput.requestEnvelope.request;
            const intent = req.type === 'IntentRequest' ? ` intent=${req.intent.name} slots=${JSON.stringify(req.intent.slots ?? {})}` : '';
            console.log(`[REQ] type=${req.type} locale=${(req as any).locale ?? '-'}${intent}`);
        }
    };

    /** Remembers the last spoken text so AMAZON.RepeatIntent can replay it. */
    public RememberSpeechResponseInterceptor: ResponseInterceptor = {
        process: (handlerInput: HandlerInput, response?: Response) => {
            const ssml = (response?.outputSpeech as any)?.ssml as string | undefined;
            if (ssml && response?.shouldEndSession === false) {
                const attrs = handlerInput.attributesManager.getSessionAttributes<SessionAttrs>();
                attrs.lastSpeech = ssml.replace(/<\/?speak>/g, '');
                handlerInput.attributesManager.setSessionAttributes(attrs);
            }
        }
    };

    // ---------------------------------------------------------------------
    // Alexa+ / name-free invocation support
    // ---------------------------------------------------------------------

    /**
     * CanFulfillIntentRequest: Alexa asks "could you handle this intent with these slots?"
     * before routing a name-free request (e.g. "Alexa, ¿cuándo llega el autobús a la parada 199?").
     * Answering accurately here is what allows Alexa (and Alexa+) to pick this skill without
     * the user saying "abre Bus Salamanca".
     */
    public CanFulfillIntentRequestHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean =>
            handlerInput.requestEnvelope.request.type === 'CanFulfillIntentRequest',
        handle: (handlerInput: HandlerInput): Response => {
            const request = handlerInput.requestEnvelope.request as canfulfill.CanFulfillIntentRequest;
            const intentName = request.intent.name;
            const slots = request.intent.slots ?? {};

            const supported = FULFILLABLE_INTENTS.has(intentName);
            const slotResults: Record<string, canfulfill.CanFulfillSlot> = {};
            let allSlotsOk = true;

            for (const [slotName, slot] of Object.entries(slots)) {
                if (slotName === 'stopNumber') {
                    const n = parseStopNumber(slot.value);
                    const ok = n !== null;
                    allSlotsOk = allSlotsOk && ok;
                    slotResults[slotName] = {
                        canUnderstand: ok ? 'YES' : 'NO',
                        canFulfill: ok ? 'YES' : 'NO'
                    };
                } else {
                    slotResults[slotName] = { canUnderstand: 'NO', canFulfill: 'NO' };
                    allSlotsOk = false;
                }
            }

            const canFulfill: canfulfill.CanFulfillIntentValues = supported ? (allSlotsOk ? 'YES' : 'MAYBE') : 'NO';

            return handlerInput.responseBuilder
                .withCanFulfillIntent({ canFulfill, slots: slotResults })
                .getResponse();
        }
    };

    // ---------------------------------------------------------------------
    // Core handlers
    // ---------------------------------------------------------------------

    public LaunchRequestHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean =>
            handlerInput.requestEnvelope.request.type === 'LaunchRequest',
        handle: async (handlerInput: HandlerInput): Promise<Response> => {
            try {
                const userId = Alexa.getUserId(handlerInput.requestEnvelope);
                const stopInfo = await this.storageService.getStop(userId);

                if (stopInfo) {
                    return await this.returnInfoResponse(handlerInput, String(stopInfo));
                }

                // No stop saved yet: ask for it and keep the session open so the user can
                // simply answer with a number ("la 199").
                const example = randomStop();
                const speechText = `Bienvenido a Bus Salamanca. Todavía no tienes una parada guardada. ` +
                    `Dime el número de la parada que quieres consultar, por ejemplo: parada ${example}. ` +
                    `Si dices "guarda la parada ${example}" la recordaré para la próxima vez. ` +
                    `Puedes ver los números de parada en ${WEB_URL}.`;
                const reprompt = `¿Qué número de parada quieres consultar? Por ejemplo, di: parada ${example}.`;

                this.setPending(handlerInput, 'check');

                return APLUtils.cardForText(handlerInput, {
                    title: "Bus Salamanca",
                    subtitle: "No hay parada configurada",
                    mainText: speechText,
                    hint: `Prueba "Alexa, guarda la parada ${example}".`,
                    reprompt,
                });
            } catch (error) {
                console.error("MAIN ERROR", error);
                return this.errorResponse(handlerInput);
            }
        }
    };

    /** "abre bus salamanca y dime cuándo llega el autobús" → uses the saved stop. */
    public CheckStopIntentHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean =>
            Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CheckStopIntent',
        handle: async (handlerInput: HandlerInput): Promise<Response> => {
            // If the LLM attached a stop number to this intent anyway, honour it.
            const n = this.getStopNumberFromSlot(handlerInput);
            if (n !== null) return await this.returnInfoResponse(handlerInput, String(n));
            return await this.LaunchRequestHandler.handle(handlerInput);
        }
    };

    /** "consulta la parada 199" */
    public CheckAnyStopIntentHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean =>
            Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CheckAnyStopIntent',
        handle: async (handlerInput: HandlerInput): Promise<Response> => {
            const n = this.getStopNumberFromSlot(handlerInput);

            if (n === null) {
                const example = randomStop();
                const speechText = `No he entendido el número de parada. ¿Qué parada quieres consultar? Por ejemplo, di: parada ${example}.`;
                this.setPending(handlerInput, 'check');
                return APLUtils.cardForText(handlerInput, {
                    title: "Bus Salamanca",
                    mainText: speechText,
                    hint: `Prueba "consulta la parada ${example}".`,
                    reprompt: speechText,
                });
            }

            return await this.returnInfoResponse(handlerInput, String(n));
        }
    };

    /** "¿cuál es mi parada?" */
    public CheckMyStopIntentHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean =>
            Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CheckMyStopIntent',
        handle: async (handlerInput: HandlerInput): Promise<Response> => {
            const userId = Alexa.getUserId(handlerInput.requestEnvelope);
            const stopInfo = await this.storageService.getStop(userId);

            if (!stopInfo) {
                const example = randomStop();
                const speechText = `No tienes ninguna parada guardada. Dime "guarda la parada ${example}" y la recordaré para informarte cada vez que abras Bus Salamanca.`;
                this.setPending(handlerInput, 'save');
                return APLUtils.cardForText(handlerInput, {
                    title: "Bus Salamanca",
                    subtitle: "Sin parada guardada",
                    mainText: speechText,
                    hint: `Prueba "guarda la parada ${example}".`,
                    reprompt: `¿Qué número de parada quieres guardar?`,
                });
            }

            let addressText = '';
            try {
                const stopName = await busService.getStopName(stopInfo);
                if (stopName) addressText = ` Está en ${stopName}.`;
            } catch (err) {
                console.error('Error fetching stop details:', err);
            }
            const speechText = `Tu parada guardada es la número ${stopInfo}.${addressText}`;

            return APLUtils.cardForText(handlerInput, {
                title: "Bus Salamanca",
                subtitle: "Parada guardada " + stopInfo,
                mainText: speechText,
                hint: "Prueba \"Alexa, ¿cuándo llega el autobús?\".",
                endSession: true,
            });
        }
    };

    /** "guarda la parada 199" */
    public AddStopIntentHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean =>
            Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AddStopIntent',
        handle: async (handlerInput: HandlerInput): Promise<Response> => {
            const n = this.getStopNumberFromSlot(handlerInput);

            if (n === null) {
                const speechText = 'No he entendido el número de parada. ¿Qué número de parada quieres guardar?';
                this.setPending(handlerInput, 'save');
                return handlerInput.responseBuilder
                    .speak(speechText)
                    .reprompt(speechText)
                    .getResponse();
            }

            return await this.saveStopResponse(handlerInput, n);
        }
    };

    /**
     * Bare number answer ("la 199", "parada 199", "199") after we asked a question.
     * Uses the pendingAction in session attributes to decide between check and save.
     */
    public StopNumberOnlyIntentHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean =>
            Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'StopNumberOnlyIntent',
        handle: async (handlerInput: HandlerInput): Promise<Response> => {
            const n = this.getStopNumberFromSlot(handlerInput);
            const attrs = handlerInput.attributesManager.getSessionAttributes<SessionAttrs>();

            if (n === null) {
                const speechText = 'No he entendido el número de parada. ¿Puedes repetirlo?';
                return handlerInput.responseBuilder.speak(speechText).reprompt(speechText).getResponse();
            }

            if (attrs.pendingAction === 'save') {
                return await this.saveStopResponse(handlerInput, n);
            }
            return await this.returnInfoResponse(handlerInput, String(n));
        }
    };

    // ---------------------------------------------------------------------
    // Built-in intents
    // ---------------------------------------------------------------------

    public HelpIntentHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean =>
            Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent',
        handle: (handlerInput: HandlerInput): Response => {
            const speechText = 'Puedo decirte cuánto falta para que lleguen los próximos autobuses de Salamanca. ' +
                'Di "consulta la parada 199" para una parada concreta, ' +
                '"guarda la parada 123" para recordar tu parada habitual, ' +
                'o simplemente "Alexa, abre Bus Salamanca" si ya tienes una guardada. ' +
                `Los números de parada están en el poste de cada parada y en ${WEB_URL}. ¿Qué parada quieres consultar?`;
            this.setPending(handlerInput, 'check');
            return APLUtils.cardForText(handlerInput, {
                title: "Bus Salamanca",
                subtitle: "Ayuda",
                mainText: speechText,
                hint: "Prueba \"consulta la parada 199\".",
                reprompt: '¿Qué número de parada quieres consultar?',
            });
        }
    };

    public RepeatIntentHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean =>
            Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.RepeatIntent',
        handle: async (handlerInput: HandlerInput): Promise<Response> => {
            const attrs = handlerInput.attributesManager.getSessionAttributes<SessionAttrs>();
            if (attrs.lastSpeech) {
                return handlerInput.responseBuilder.speak(attrs.lastSpeech).reprompt(attrs.lastSpeech).getResponse();
            }
            return await this.LaunchRequestHandler.handle(handlerInput);
        }
    };

    /** "sí" while we asked something → re-run the launch flow; "no" → goodbye. */
    public YesNoIntentHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean => {
            if (Alexa.getRequestType(handlerInput.requestEnvelope) !== 'IntentRequest') return false;
            const name = Alexa.getIntentName(handlerInput.requestEnvelope);
            return name === 'AMAZON.YesIntent' || name === 'AMAZON.NoIntent';
        },
        handle: async (handlerInput: HandlerInput): Promise<Response> => {
            const name = Alexa.getIntentName(handlerInput.requestEnvelope);
            if (name === 'AMAZON.NoIntent') return this.CancelAndStopIntentHandler.handle(handlerInput) as Response;
            const speechText = '¿Qué número de parada quieres consultar?';
            this.setPending(handlerInput, 'check');
            return handlerInput.responseBuilder.speak(speechText).reprompt(speechText).getResponse();
        }
    };

    /** Unrecognised utterance inside our session. */
    public FallbackIntentHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean =>
            Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent',
        handle: (handlerInput: HandlerInput): Response => {
            const speechText = 'Lo siento, eso no lo sé hacer. Puedo consultar los próximos autobuses de una parada de Salamanca. ' +
                'Di, por ejemplo, "consulta la parada 199" o "guarda la parada 123".';
            this.setPending(handlerInput, 'check');
            return handlerInput.responseBuilder
                .speak(speechText)
                .reprompt('¿Qué número de parada quieres consultar?')
                .getResponse();
        }
    };

    public CancelAndStopIntentHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean => {
            if (Alexa.getRequestType(handlerInput.requestEnvelope) !== 'IntentRequest') return false;
            const name = Alexa.getIntentName(handlerInput.requestEnvelope);
            return name === 'AMAZON.CancelIntent' || name === 'AMAZON.StopIntent' || name === 'AMAZON.NavigateHomeIntent';
        },
        handle: (handlerInput: HandlerInput): Response => {
            return APLUtils.cardForText(handlerInput, {
                title: "Bus Salamanca",
                subtitle: "Hasta pronto",
                mainText: "¡Adiós! Espero que llegues a tiempo al autobús.",
                hint: "Prueba \"Alexa, abre Bus Salamanca\".",
                endSession: true,
            });
        }
    };

    public SessionEndedRequestHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean =>
            handlerInput.requestEnvelope.request.type === 'SessionEndedRequest',
        handle: (handlerInput: HandlerInput): Response => {
            const req = handlerInput.requestEnvelope.request as any;
            console.log(`Session ended. reason=${req.reason} error=${JSON.stringify(req.error ?? null)}`);
            return handlerInput.responseBuilder.getResponse();
        }
    };

    /** Any IntentRequest we don't know (e.g. a new built-in Alexa+ sends) → treat like fallback. */
    public UnknownIntentHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean =>
            Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest',
        handle: (handlerInput: HandlerInput): Response => {
            console.warn(`Unhandled intent: ${Alexa.getIntentName(handlerInput.requestEnvelope)}`);
            return this.FallbackIntentHandler.handle(handlerInput) as Response;
        }
    };

    // ---------------------------------------------------------------------
    // Echo Show widget lifecycle
    //
    // These arrive outside any conversation, when the user installs or removes the widget from
    // the device. The device id is what the Data Store REST API pushes to, so it is the whole
    // point of handling them: WidgetRefresher can only reach devices recorded here.
    // ---------------------------------------------------------------------

    public WidgetInstalledHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean =>
            handlerInput.requestEnvelope.request.type === 'Alexa.DataStore.PackageManager.UsagesInstalled',
        handle: async (handlerInput: HandlerInput): Promise<Response> => {
            const packageId = (handlerInput.requestEnvelope.request as any).payload?.packageId ?? WIDGET_PACKAGE_ID;
            const deviceId = Alexa.getDeviceId(handlerInput.requestEnvelope);
            const userId = Alexa.getUserId(handlerInput.requestEnvelope);

            if (deviceId && userId) {
                await this.storageService.addWidgetDevice(deviceId, userId, packageId);
                console.log(`[widget] installed packageId=${packageId} device=${deviceId}`);
            } else {
                console.warn(`[widget] UsagesInstalled without deviceId/userId, cannot track`);
            }
            return handlerInput.responseBuilder.getResponse();
        }
    };

    public WidgetRemovedHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean =>
            handlerInput.requestEnvelope.request.type === 'Alexa.DataStore.PackageManager.UsagesRemoved',
        handle: async (handlerInput: HandlerInput): Promise<Response> => {
            const packageId = (handlerInput.requestEnvelope.request as any).payload?.packageId ?? WIDGET_PACKAGE_ID;
            const deviceId = Alexa.getDeviceId(handlerInput.requestEnvelope);

            if (deviceId) {
                await this.storageService.removeWidgetDevice(deviceId, packageId);
                console.log(`[widget] removed packageId=${packageId} device=${deviceId}`);
            }
            return handlerInput.responseBuilder.getResponse();
        }
    };

    /**
     * Data store and package manager problems. Nothing to say to the user — a widget has no
     * conversation — but these are the only signal that pushes are silently not landing.
     */
    public WidgetErrorHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean => {
            const type = handlerInput.requestEnvelope.request.type;
            return type === 'Alexa.DataStore.Error'
                || type === 'Alexa.DataStore.PackageManager.InstallationError'
                || type === 'Alexa.DataStore.PackageManager.UpdateRequest';
        },
        handle: async (handlerInput: HandlerInput): Promise<Response> => {
            const req = handlerInput.requestEnvelope.request as any;
            const deviceId = Alexa.getDeviceId(handlerInput.requestEnvelope);
            console.warn(`[widget] ${req.type} device=${deviceId ?? '-'} error=${JSON.stringify(req.error ?? req.payload ?? null)}`);

            // A device that is gone for good should stop being pushed to.
            if (req.error?.type === 'DEVICE_PERMANENTLY_UNAVAILABLE' && deviceId) {
                await this.storageService.removeWidgetDevice(deviceId, WIDGET_PACKAGE_ID);
            }
            return handlerInput.responseBuilder.getResponse();
        }
    };

    public ErrorHandler: Alexa.ErrorHandler = {
        canHandle: () => true,
        handle: (handlerInput, error) => {
            console.error(`Error handled: ${error.message}`, error.stack);
            return this.errorResponse(handlerInput);
        }
    };

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private getStopNumberFromSlot(handlerInput: HandlerInput): number | null {
        const request = handlerInput.requestEnvelope.request;
        if (request.type !== 'IntentRequest') return null;
        const slot = request.intent.slots?.stopNumber;
        if (!slot) return null;

        // Prefer resolved value (Alexa+ may resolve to a canonical value), fall back to raw value.
        const resolved = slot.resolutions?.resolutionsPerAuthority
            ?.find(r => r.status?.code === 'ER_SUCCESS_MATCH')?.values?.[0]?.value?.name;
        return parseStopNumber(resolved) ?? parseStopNumber(slot.value) ?? parseStopNumber((slot as any).slotValue?.value);
    }

    private setPending(handlerInput: HandlerInput, action: PendingAction) {
        const attrs = handlerInput.attributesManager.getSessionAttributes<SessionAttrs>();
        attrs.pendingAction = action;
        handlerInput.attributesManager.setSessionAttributes(attrs);
    }

    private errorResponse(handlerInput: HandlerInput): Response {
        return handlerInput.responseBuilder
            .speak('Lo siento, ha ocurrido un problema al consultar los autobuses. Inténtalo de nuevo en unos segundos.')
            .withShouldEndSession(true)
            .getResponse();
    }

    private async saveStopResponse(handlerInput: HandlerInput, stopNumber: number): Promise<Response> {
        const userId = Alexa.getUserId(handlerInput.requestEnvelope);
        try {
            await this.storageService.saveStop(userId, stopNumber);
        } catch (error) {
            console.error('Storage save error:', error);
            return handlerInput.responseBuilder
                .speak('Ha ocurrido un error al guardar la parada. Inténtalo de nuevo.')
                .withShouldEndSession(true)
                .getResponse();
        }

        let addressText = '';
        try {
            const stopName = await busService.getStopName(stopNumber);
            if (stopName) addressText = ` (${stopName})`;
        } catch { /* best effort */ }

        return APLUtils.cardForText(handlerInput, {
            title: "Bus Salamanca",
            subtitle: `Parada ${stopNumber} guardada`,
            mainText: `He guardado la parada ${stopNumber}${addressText}. A partir de ahora, con decir "Alexa, abre Bus Salamanca" te diré los próximos autobuses de esa parada.`,
            hint: "Prueba \"Alexa, abre Bus Salamanca\".",
            endSession: true,
        });
    }

    private async returnInfoResponse(handlerInput: HandlerInput, stopInfo: string): Promise<Response> {
        try {
            console.debug('returnInfoResponse - stopInfo', stopInfo);
            const data = await busService.getStopInfo(Number(stopInfo));

            if (typeof data === 'string') {
                return handlerInput.responseBuilder
                    .speak(data)
                    .withStandardCard("Bus Salamanca - Parada " + stopInfo, data, CARD_IMAGE_SMALL, CARD_IMAGE_LARGE)
                    .withShouldEndSession(true)
                    .getResponse();
            }

            if (data.arrivalData.length === 0) {
                return APLUtils.cardForText(handlerInput, {
                    title: "Bus Salamanca - Parada " + stopInfo,
                    subtitle: "Sin autobuses previstos",
                    mainText: `Ahora mismo no hay autobuses previstos para la parada ${stopInfo}${data.stopData.address ? ', ' + data.stopData.address : ''}.`,
                    hint: "Prueba \"consulta la parada 199\".",
                    endSession: true,
                });
            }

            if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
                handlerInput.responseBuilder.addDirective(
                    APLUtils.createDirectivePayload(stopInfo, data.stopData.address, data.arrivalData)
                );
            }

            const intro = data.stopData.address
                ? `Parada ${stopInfo}, ${data.stopData.address}. `
                : `Parada ${stopInfo}. `;

            return handlerInput.responseBuilder
                .speak(intro + data.linesText)
                .withStandardCard("Bus Salamanca - Parada " + stopInfo, data.linesText, CARD_IMAGE_SMALL, CARD_IMAGE_LARGE)
                .withShouldEndSession(true)
                .getResponse();

        } catch (error) {
            console.error('Error in returnInfoResponse:', error);
            return this.errorResponse(handlerInput);
        }
    }
}
