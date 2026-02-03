import { HandlerInput, RequestHandler } from 'ask-sdk-core';
import { Response } from 'ask-sdk-model';
import { BusService } from '../services/BusService.js';
import { IStorageService } from '../services/StorageService.js';
import { APLUtils } from '../utils/APLUtils.js';
import * as Alexa from 'ask-sdk-core';

const busService = new BusService();

export class Handlers {
    constructor(private storageService: IStorageService) { }

    public LaunchRequestHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean => {
            return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
        },
        handle: async (handlerInput: HandlerInput): Promise<Response> => {
            try {
                const userId = handlerInput.requestEnvelope.context.System.user.userId;
                const stopInfo = await this.storageService.getStop(userId);

                if (stopInfo) {
                    return await this.returnInfoResponse(handlerInput, String(stopInfo));
                } else {
                    const stopRandom1 = Math.floor(Math.random() * 250) + 1;
                    const stopRandom2 = Math.floor(Math.random() * 250) + 1;
                    const stopRandom3 = Math.floor(Math.random() * 250) + 1;
                    const speechText = "No sé de qué parada puedo informarte.\nPuedes decir Abre Bus Salamanca y guarda la parada " + stopRandom1 + " para memorizar tu parada y que te informe cada que vez que abras esta skill, puedes consultar las paradas en la web\nsalamancadetransportes.com\no en su aplicación oficial.\nTambién puedes consultar una parada en específico diciendo abre Bus Salamanca y revisa la parada " + stopRandom2 + ".";

                    return APLUtils.cardForText(handlerInput, {
                        title: "Bus Salamanca",
                        subtitle: "No hay parada configurada",
                        mainText: speechText,
                        hint: "Prueba \"Alexa, guarda la parada " + stopRandom3 + "\"."
                    });
                }
            } catch (error) {
                console.error("MAIN ERROR", error);
                return handlerInput.responseBuilder
                    .speak("Ha ocurrido un error")
                    .withShouldEndSession(true)
                    .getResponse();
            }
        }
    };

    public CheckStopIntentHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean => {
            const request = handlerInput.requestEnvelope.request;
            return request.type === 'IntentRequest' && request.intent.name === 'CheckStopIntent';
        },
        handle: async (handlerInput: HandlerInput): Promise<Response> => {
            // Logic is same as LaunchRequestHandler in original code for some reason, 
            // but usually this should verify if a slot is present or just rely on the stored stop?
            // Original code: handle: LaunchRequestHandler.handle
            // So we delegate to LaunchRequestHandler
            return await this.LaunchRequestHandler.handle(handlerInput);
        }
    };

    public CheckAnyStopIntentHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean => {
            const request = handlerInput.requestEnvelope.request;
            return request.type === 'IntentRequest' && request.intent.name === 'CheckAnyStopIntent';
        },
        handle: async (handlerInput: HandlerInput): Promise<Response> => {
            const request = handlerInput.requestEnvelope.request;
            const stopNumber = request.type === 'IntentRequest' ? request.intent.slots?.stopNumber?.value : undefined;

            if (!stopNumber) {
                const speechText = 'No he entendido el número de parada que quieres consultar. Para consultar cualquier parada dí Abre bus salamanca y consulta la parada 199.';
                return APLUtils.cardForText(handlerInput, {
                    title: "Bus Salamanca",
                    mainText: speechText,
                    hint: `Prueba "Alexa, consulta la parada 199".`
                });
            }

            return await this.returnInfoResponse(handlerInput, stopNumber);
        }
    };

    public CheckMyStopIntentHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean => {
            const request = handlerInput.requestEnvelope.request;
            return request.type === 'IntentRequest' && request.intent.name === 'CheckMyStopIntent';
        },
        handle: async (handlerInput: HandlerInput): Promise<Response> => {
            const userId = handlerInput.requestEnvelope.context.System.user.userId;
            const stopInfo = await this.storageService.getStop(userId);

            if (!stopInfo) {
                const speechText = 'No tienes ninguna parada guardada. Puedes decirme abre Bus Salamanca y guarda la parada 199 para poder informate de los autobuses que van a llegar a tu parada más cercana.';
                return handlerInput.responseBuilder
                    .speak(speechText)
                    .withSimpleCard('Parada guardada', speechText)
                    .getResponse();
            }

            let addressText = '';
            try {
                const stopName = await busService.getStopName(stopInfo);
                if (stopName) {
                    addressText = ` La dirección de la parada es: ${stopName}.`;
                }
            } catch (err) {
                console.error('Error fetching stop details:', err);
            }
            const speechText = `Tu parada guardada es la número ${stopInfo}.${addressText}`;

            return APLUtils.cardForText(handlerInput, {
                title: "Bus Salamanca",
                subtitle: "Parada guardada " + stopInfo,
                mainText: speechText,
                hint: "Prueba \"Alexa, ¿Cuándo llega el autobús?\"."
            });
        }
    };

    public AddStopIntentHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean => {
            const request = handlerInput.requestEnvelope.request;
            return request.type === 'IntentRequest' && request.intent.name === 'AddStopIntent';
        },
        handle: async (handlerInput: HandlerInput): Promise<Response> => {
            const userId = handlerInput.requestEnvelope.context.System.user.userId;
            const request = handlerInput.requestEnvelope.request;
            const stopNumber = request.type === 'IntentRequest' ? request.intent.slots?.stopNumber?.value : undefined;

            if (!stopNumber) {
                const speechText = 'No he entendido el número de parada. Por favor, dime el número de parada que quieres guardar.';
                return handlerInput.responseBuilder
                    .speak(speechText)
                    .reprompt(speechText)
                    .getResponse();
            }

            try {
                await this.storageService.saveStop(userId, Number(stopNumber));
                return APLUtils.cardForText(handlerInput, {
                    title: "Bus Salamanca",
                    subtitle: `Parada ${stopNumber} guardada`,
                    mainText: `He guardado la parada número ${stopNumber} para tí.\nAhora solo necesitas decir abre Bus Salamanca para que te informe sobre esa parada.`,
                    hint: "Prueba \"Alexa, cuando llega el autbús\"."
                });
            } catch (error) {
                console.error('Storage save error:', error);
                const speechText = 'Ha ocurrido un error al guardar la parada.';
                return handlerInput.responseBuilder
                    .speak(speechText)
                    .getResponse();
            }
        }
    };

    public HelpIntentHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean => {
            const request = handlerInput.requestEnvelope.request;
            return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent';
        },
        handle: (handlerInput: HandlerInput): Response => {
            const speechText = 'Puedo decirte cuanto tiempo queda para que lleguen los próximos autobuses. Puedes decirme, por ejemplo, abre Bus Salamanca y revisa la parada 199, o siemplemente "Alexa, Abre Bus Salamanca" si ya has guardado tu parada favorita.\nPara cambiar tu parada puede decir "Alexa, abre Bus Salamanca y guarda la parada 123", para saber que paradas hay puedes ir a la web salamancadetransportes.com o a su aplicación oficial.\nSi quieres saber más sobre la skill puedes decir "Alexa, abre Bus Salamanca y dime ayuda" para que te repita este mensaje.';
            return APLUtils.cardForText(handlerInput, {
                title: "Bus Salamanca",
                subtitle: "Ayuda",
                mainText: speechText,
                hint: "Prueba \"Alexa, ¿Cuándo llega el autbús?\"."
            });
        }
    };

    public CancelAndStopIntentHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean => {
            const request = handlerInput.requestEnvelope.request;
            return request.type === 'IntentRequest' && (request.intent.name === 'AMAZON.CancelIntent' || request.intent.name === 'AMAZON.StopIntent');
        },
        handle: (handlerInput: HandlerInput): Response => {
            return APLUtils.cardForText(handlerInput, {
                title: "Bus Salamanca",
                subtitle: "Cerrando skill",
                mainText: "¡Adiós!\nEspero que llegues a tiempo al autobús.",
                hint: "Prueba \"Alexa, Abre Bus Salamanca\"."
            });
        }
    };

    public SessionEndedRequestHandler: RequestHandler = {
        canHandle: (handlerInput: HandlerInput): boolean => {
            return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
        },
        handle: (handlerInput: HandlerInput): Response => {
            console.log(`Session ended with reason: ${(handlerInput.requestEnvelope.request as any).reason}`);
            return handlerInput.responseBuilder.getResponse();
        }
    };

    public ErrorHandler: import('ask-sdk-core').ErrorHandler = {
        canHandle: () => true,
        handle: (handlerInput, error) => {
            console.error(`Error handled: ${error.message}`);
            return handlerInput.responseBuilder
                .speak('Lo siento, no he entendido tu comando. Por favor, dilo de nuevo.')
                .reprompt('Lo siento, no he entendido tu comando. Por favor, dilo de nuevo.')
                .getResponse();
        }
    };

    private async returnInfoResponse(handlerInput: HandlerInput, stopInfo: string): Promise<Response> {
        try {
            console.debug('returnInfoResponse - stopInfo', stopInfo);
            const data = await busService.getStopInfo(Number(stopInfo));
            // console.debug('returnInfoResponse - data', data);

            if (typeof data === 'string') {
                return handlerInput.responseBuilder
                    .speak(data)
                    .withStandardCard(
                        "Bus Salamanca - Parada " + stopInfo,
                        data,
                        "https://m.media-amazon.com/images/I/41E21ldSofL.png",
                        "https://bussalamanca.s3.eu-west-1.amazonaws.com/publicimages/BusSalamancaBackground.png",
                    )
                    .withSimpleCard("Bus Salamanca - Parada " + stopInfo, data)
                    .withShouldEndSession(true)
                    .getResponse();
            }

            if (data.arrivalData.length === 0) {
                return APLUtils.cardForText(handlerInput, {
                    title: "Bus Salamanca - Parada " + stopInfo,
                    subtitle: "No hay información disponible",
                    mainText: "No hay información disponible para la parada " + stopInfo + ".",
                    hint: "Prueba \"Alexa, ¿Cuál es mi parada?\"."
                });
            }

            if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
                const aplDirective = APLUtils.createDirectivePayload(stopInfo, data.stopData.address, data.arrivalData);
                handlerInput.responseBuilder.addDirective(aplDirective);
            }

            return handlerInput.responseBuilder
                .speak(data.linesText)
                .reprompt(data.linesText)
                .withSimpleCard(`Próximas línas de autobús (Parada ${stopInfo}):`, data.linesText)
                .withStandardCard(
                    "Bus Salamanca - Parada " + stopInfo,
                    data.linesText,
                    "https://m.media-amazon.com/images/I/41E21ldSofL.png",
                    "https://bussalamanca.s3.eu-west-1.amazonaws.com/publicimages/BusSalamancaBackground.png",
                )
                .getResponse();

        } catch (error) {
            console.error('Error in returnInfoResponse:', error);
            return handlerInput.responseBuilder
                .speak("Ha ocurrido un error al procesar la información.")
                .withShouldEndSession(true)
                .getResponse();
        }
    }
}
