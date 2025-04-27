import {
    ErrorHandler,
    HandlerInput,
    RequestHandler,
    SkillBuilders,
  } from 'ask-sdk-core';
import {
  Directive,
  Response,
  SessionEndedRequest,
} from 'ask-sdk-model';
import main, { dataStructured, getStopInfo } from './fetch.js';
import AWS from 'aws-sdk';
import Alexa from 'ask-sdk-core';


const APL_TOKEN_CARD = "BusSalamancaToken";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'MISSING_DYNAMODB_TABLE_NAME'; // Use env variable or default

// Make sure this matches your DynamoDB table's partition key name
const DYNAMO_KEY_NAME = 'BusSalamanca'; // <-- Change this if your key is not 'userId'

// Helper to build the APL document with dynamic data
function buildCardDocument(stopNumber: string, stopAddress: string, lines: {line: number, minutesRemaining: number}[]) {
    return {
        "type": "APL",
        "version": "2024.3",
        "theme": "dark",
        "import": [
            {
                "name": "alexa-layouts",
                "version": "1.7.0"
            }
        ],
        "styles": {
            "customStatDescriptionStyle": {
                "extends": "textStyleCallout",
                "values": [
                    {
                        "color": "ivory",
                        "shrink": 1,
                        "spacing": "@spacingXSmall",
                        "fontStyle": "italic",
                        "_fontSize": "@fontSizeMedium",
                        "padding": "20dp"
                    },
                    {
                        "when": "${@viewportProfile == @hubRoundSmall}",
                        "maxLines": 2,
                        "_fontSize": "@fontSizeXSmall",
                        "padding": "5dp"
                    },
                    {
                        "when": "${@viewportProfile == @tvLandscapeXLarge}",
                        "fontSize": "@fontSize2XLarge"
                    }
                ]
            }
        },
        "mainTemplate": {
            "parameters": [
                "gameStrings",
                "gameStats",
                "images"
            ],
            "items": [
                {
                    "type": "Container",
                    "height": "100%",
                    "width": "100%",
                    "items": [
                        {
                            "type": "AlexaBackground",
                            "backgroundImageSource": "https://bussalamanca.s3.eu-west-1.amazonaws.com/publicimages/BusSalamancaBackground.png",
                            "backgroundBlur": false
                        },
                        {
                            "type": "Container",
                            "grow": 1,
                            "width": "100%",
                            "_height": "100%",
                            "alignSelf": "center",
                            "items": [
                                {
                                    "type": "Sequence",
                                    "height": "100%",
                                    "justifyContent": "center",
                                    "items": [
                                        {
                                            "type": "AlexaHeader",
                                            //"headerBackgroundColor": "black",
                                            "headerTitle": `BUS SALAMANCA - PARADA ${stopNumber} `,
                                            "headerSubtitle": stopAddress,
                                            "headerAttributionImage": "https://m.media-amazon.com/images/I/41E21ldSofL.png",
                                            "opacity": "@opacityNonResponse",
                                            "when": "${@viewportProfile != @hubRoundSmall}"
                                        },
                                        {
                                            "type": "AlexaHeader",
                                            "headerBackgroundColor": "black",
                                            "headerAttributionImage": "https://m.media-amazon.com/images/I/41E21ldSofL.png",
                                            "opacity": "@opacityNonResponse",
                                            "when": "${@viewportProfile == @hubRoundSmall}"
                                        },
                                        {
                                            "text": "Próximas líneas de autobuses en llegar: ",
                                            "textAlign": "center",
                                            "type": "Text",
                                            "when": "${@viewportProfile != @hubRoundSmall}",
                                            "width": "100%",
                                            "paddingTop": "10dp",
                                            "paddingBottom": "10dp",
                                            "direction": "row",
                                            "alignSelf": "center",
                                            "justifyContent": "center"
                                        },
                                        // Dynamically generate bus lines
                                        ...lines.map(l => ({
                                            "type": "Container",
                                            "direction": "row",
                                            "width": "100%",
                                            "alignSelf": "center",
                                            "justifyContent": "center",
                                            "items": [
                                                {
                                                    "type": "Text",
                                                    "text": `Línea ${l.line}`,
                                                    "width": "45%",
                                                    "textAlign": "right",
                                                    "alignSelf": "center"
                                                },
                                                {
                                                    "type": "Text",
                                                    "text": (l.minutesRemaining < 2) ? "llegando" : `en ${l.minutesRemaining} minutos`,
                                                    "alignSelf": "center",
                                                    "width": "55%",
                                                    "style": "customStatDescriptionStyle"
                                                }
                                            ]
                                        }))
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    };
}

// Update createDirectivePayload to use a single object parameter
const createDirectivePayload = ({
    stopNumber,
    stopAddress,
    lines
}: {
    stopNumber: string,
    stopAddress: string,
    lines: {line: number, minutesRemaining: number}[]
}): Directive => {
    const cardDocument = buildCardDocument(stopNumber, stopAddress, lines);
    return {
        type: 'Alexa.Presentation.APL.RenderDocument',
        token: APL_TOKEN_CARD,
        document: cardDocument
    };
};

async function returnInforResponse(handlerInput: HandlerInput, stopInfo: string) {
  try {
    console.debug('returnInforResponse - stopInfo', stopInfo);
    const data = await dataStructured(Number(stopInfo));
    console.debug('returnInforResponse - data', data);

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

    // Add APL directive if supported
    if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
      console.debug('returnInforResponse - APL enabled');
      const aplDirective = createDirectivePayload({
        stopNumber: data.stopData.number,
        stopAddress: data.stopData.address, // Assuming text contains the address
        lines: data.arrivalData // Assuming text is a JSON string with lines info
      });
      handlerInput.responseBuilder.addDirective(aplDirective);
      console.debug('returnInforResponse - APL completed');
    }

    return handlerInput.responseBuilder
      .speak(data.linesText)
      .reprompt(data.linesText)
      .withSimpleCard(`Próximas línas de autobús (Parada ${stopInfo}):`, data.linesText)
      .withStandardCard(
        "Bus Salamanca - Parada Guardada" + stopInfo,
        data.linesText,
        "https://m.media-amazon.com/images/I/41E21ldSofL.png",
        "https://bussalamanca.s3.eu-west-1.amazonaws.com/publicimages/BusSalamancaBackground.png",
      )
      .getResponse();
      
  } catch (error) {
    console.error('Error in returnInforResponse:', error);
    return handlerInput.responseBuilder
      .speak("Ha ocurrido un error al procesar la información.")
      .withShouldEndSession(true)
      .getResponse();
  }
}

const LaunchRequestHandler : RequestHandler = {
  canHandle(handlerInput : HandlerInput) : boolean {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'LaunchRequest';        
  },
  async handle(handlerInput : HandlerInput) : Promise<Response> {
    try {

      // 1. Get userId
      const userId = handlerInput.requestEnvelope.context.System.user.userId;

      // 2. Query DynamoDB for user's stop
      let stopInfo;

      try {

        const result = await dynamoDb.get({
          TableName: TABLE_NAME,
          Key: { [DYNAMO_KEY_NAME]: userId } // Use correct key name
        }).promise();

        stopInfo = result.Item?.stop; // Assuming "stop" is the attribute name

      } catch (dbErr) {

        console.error('DynamoDB error:', dbErr);

        return handlerInput.responseBuilder
          .speak("Ha ocurrido un error con DynamoDB.")
          .withShouldEndSession(true)
          .getResponse();

      }


      // 3. Respond based on whether a stop is associated
      let speechText: string;
      if (stopInfo) {


        console.debug('LaunchRequestHandler - returnInforResponse', stopInfo);
        return await returnInforResponse(handlerInput, stopInfo);
        

      } else {

        speechText = 'No tienes ninguna parada guardada.<br>Puedes decir Abre Bus Salamanca y guarda la parada 199 para memorizar tu parada, puedes consultar las paradas en la web salamancadetransportes.com o en su aplicación oficial; también puedes consultar una parada en específico diciendo abre Bus Salamanca y revisa la parada 199.';
        
        // // Add APL directive if supported
        // if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
        //   const aplDirective = createDirectivePayload(DOCUMENT_ID, datasource);
        //   handlerInput.responseBuilder.addDirective(aplDirective as any);
        // }

        return handlerInput.responseBuilder
          .speak(speechText)
          .withStandardCard(
            "Bus Salamanca - No hay parada configurada:",
            speechText,
            "https://m.media-amazon.com/images/I/41E21ldSofL.png",
            "https://bussalamanca.s3.eu-west-1.amazonaws.com/publicimages/BusSalamancaBackground.png",
          )
          .withSimpleCard("Bus Salamanca - No hay parada configurada:", speechText)
          .getResponse();
      }
    } catch (error) {

      console.error("MAIN ERROR", error);
      return handlerInput.responseBuilder
        .speak("Ha ocurrido un error")
        .withShouldEndSession(true)
        .getResponse();
    }
  },
};

const HelpIntentHandler : RequestHandler = {
  canHandle(handlerInput : HandlerInput) : boolean {
    const request = handlerInput.requestEnvelope.request;    
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput : HandlerInput) : Response {
    const speechText = 'Puedo decirte cuanto tiempo queda para que lleguen los próximos autobuses.<br>Puedes decirme, por ejemplo, abre Bus Salamanca y revisa la parada 199, o siemplemente "Alexa, Abre Bus Salamanca" si ya has guardado tu parada favorita.';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Bus Salamanca', speechText)
      .withStandardCard(
        "Bus Salamanca",
        speechText,
        "https://m.media-amazon.com/images/I/41E21ldSofL.png",
        "https://bussalamanca.s3.eu-west-1.amazonaws.com/publicimages/BusSalamancaBackground.png",
      )
      .withShouldEndSession(true)
      .getResponse();
  },
};

const CancelAndStopIntentHandler : RequestHandler = {
  canHandle(handlerInput : HandlerInput) : boolean {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
         || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput : HandlerInput) : Response {
    const speechText = 'Adiós!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Bus Salamanca', speechText)
      .withShouldEndSession(true)
      .getResponse();
  },
};

const SessionEndedRequestHandler : RequestHandler = {
  canHandle(handlerInput : HandlerInput) : boolean {
    const request = handlerInput.requestEnvelope.request;    
    return request.type === 'SessionEndedRequest';
  },
  handle(handlerInput : HandlerInput) : Response {
    console.log(`Session ended with reason: ${(handlerInput.requestEnvelope.request as SessionEndedRequest).reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const AddStopIntentHandler : RequestHandler = {
  canHandle(handlerInput : HandlerInput) : boolean {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AddStopIntent';
  },
  async handle(handlerInput : HandlerInput) : Promise<Response> {
    const userId = handlerInput.requestEnvelope.context.System.user.userId;
    const stopNumber = handlerInput.requestEnvelope.request.type === 'IntentRequest'
      ? handlerInput.requestEnvelope.request.intent.slots?.stopNumber?.value
      : undefined;

    if (!stopNumber) {
      const speechText = 'No he entendido el número de parada. Por favor, dime el número de parada que quieres guardar.';
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .getResponse();
    }

    try {
      await dynamoDb.put({
        TableName: TABLE_NAME,
        Item: {
          [DYNAMO_KEY_NAME]: userId, // Use correct key name
          stop: stopNumber
        }
      }).promise();

      const speechText = `He guardado la parada número ${stopNumber} para ti.\nAhora solo necesitas decir abre Bus Salamanca para que te informe sobre esa parada.`;
      return handlerInput.responseBuilder
        .speak(speechText)
        .withStandardCard(
          "Bus Salamanca - Parada Guardada" + stopNumber,
          speechText,
          "https://m.media-amazon.com/images/I/41E21ldSofL.png",
          "https://bussalamanca.s3.eu-west-1.amazonaws.com/publicimages/BusSalamancaBackground.png",
        )
        .withSimpleCard('Parada guardada', speechText)
        .getResponse();
    } catch (error) {
      console.error('DynamoDB put error:', error);
      const speechText = 'Ha ocurrido un error al guardar la parada.';
      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();
    }
  }
};

const CheckStopIntentHandler : RequestHandler = {
  canHandle(handlerInput : HandlerInput) : boolean {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'CheckStopIntent';
  },
  async handle(handlerInput : HandlerInput) : Promise<Response> {
    const userId = handlerInput.requestEnvelope.context.System.user.userId;
    let stopInfo;
    try {
      const result = await dynamoDb.get({
        TableName: TABLE_NAME,
        Key: { [DYNAMO_KEY_NAME]: userId } // Use correct key name
      }).promise();
      stopInfo = result.Item?.stop;
    } catch (dbErr) {
      console.error('DynamoDB error:', dbErr);
    }

    let speechText: string;
    if (stopInfo) {
      console.debug('CheckStopIntentHandler - returnInforResponse', stopInfo);
      return await returnInforResponse(handlerInput, stopInfo);
    } else {
      speechText = 'No tienes ninguna parada guardada. Puedes decirme una para guardarla.';
    }

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Bus Salamanca - No hay ninguna parada guardada', speechText)
      .withStandardCard(
        'Bus Salamanca - No hay ninguna parada guardada',
        speechText,
        "https://m.media-amazon.com/images/I/41E21ldSofL.png",
        "https://bussalamanca.s3.eu-west-1.amazonaws.com/publicimages/BusSalamancaBackground.png",
      )
      .getResponse();
  }
};

const CheckAnyStopIntentHandler : RequestHandler = {
  canHandle(handlerInput : HandlerInput) : boolean {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'CheckAnyStopIntent';
  },
  async handle(handlerInput : HandlerInput) : Promise<Response> {
    const stopNumber = handlerInput.requestEnvelope.request.type === 'IntentRequest'
      ? handlerInput.requestEnvelope.request.intent.slots?.stopNumber?.value
      : undefined;

    if (!stopNumber) {
      const speechText = 'No he entendido el número de parada que quieres consultar. Para consultar cualquier parada dí Abre bus salamanca y consulta la parada 193.';
      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();
    }

    
    console.debug('CheckAnyStopIntentHandler - returnInforResponse', stopNumber);
    return await returnInforResponse(handlerInput, stopNumber);

    // Aquí puedes llamar a tu función main o lógica para obtener información de la parada
    try {
      const stopInfo = await main(Number(stopNumber)); // Asume que main puede recibir el número de parada
      const speechText = typeof stopInfo === 'string'
        ? stopInfo
        : `Información para la parada ${stopNumber}: ${JSON.stringify(stopInfo)}`;
      return handlerInput.responseBuilder
        .speak(speechText)
        .withSimpleCard(`Parada ${stopNumber}`, speechText)
        .getResponse();
    } catch (error) {
      console.error('Error al consultar la parada:', error);
      const speechText = 'Ha ocurrido un error al consultar la parada.';
      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();
    }
  }
};



const CheckMyStopIntentHandler : RequestHandler = {
  canHandle(handlerInput : HandlerInput) : boolean {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'CheckMyStopIntent';
  },
  async handle(handlerInput : HandlerInput) : Promise<Response> {
    const userId = handlerInput.requestEnvelope.context.System.user.userId;
    let stopInfo;
    try {
      const result = await dynamoDb.get({
        TableName: TABLE_NAME,
        Key: { [DYNAMO_KEY_NAME]: userId }
      }).promise();
      stopInfo = result.Item?.stop;

      if (!stopInfo) {
        const speechText = 'No tienes ninguna parada guardada. Puedes decirme abre Bus Salamanca y guarda la parada 199 para poder informate de los autobuses que van a llegar a tu parada más cercana.';
        return handlerInput.responseBuilder
          .speak(speechText)
          .withSimpleCard('Parada guardada', speechText)
          .getResponse();
      }
    } catch (dbErr) {
      console.error('DynamoDB error:', dbErr);
    }

    let speechText: string;
    if (stopInfo) {
      let addressText = '';
      try {
        const stopDetails = await getStopInfo(stopInfo);
        if (stopDetails) {
          addressText = ` La dirección de la parada es: ${stopDetails}.`;
        }
      } catch (err) {
        console.error('Error fetching stop details:', err);
      }
      speechText = `Tu parada guardada es la número ${stopInfo}.${addressText}`;
    } else {
      speechText = 'No tienes ninguna parada guardada. Puedes decirme abre Bus Salamanca y guarda la parada 199 para poder informate de los autobuses que van a llegar a tu parada más cercana.';
    }

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Parada guardada', speechText)
      .getResponse();
  }
};

const ErrorHandler : ErrorHandler = {
  canHandle(handlerInput : HandlerInput, error : Error ) : boolean {
    return true;
  },
  handle(handlerInput : HandlerInput, error : Error) : Response {
    console.error(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I don\'t understand your command. Please say it again.')
      .reprompt('Sorry, I don\'t understand your command. Please say it again.')
      .getResponse();
  }
};


// let skill;

// export const handler = async (event, context) => {
//   console.log(`REQUEST++++${JSON.stringify(event)}`);
//   if (!skill) {
//     skill = SkillBuilders.custom()
//       .addRequestHandlers(
//         LaunchRequestHandler,
//         AskWeatherIntentHandler,
//         HelpIntentHandler,
//         CancelAndStopIntentHandler,
//         SessionEndedRequestHandler,
//       )
//       .addErrorHandlers(ErrorHandler)
//       .create();
//   }

//   const response = await skill.invoke(event, context);
//   console.log(`RESPONSE++++${JSON.stringify(response)}`);

//   return response;
// };

export const handler = SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    AddStopIntentHandler,
    CheckStopIntentHandler,
    CheckAnyStopIntentHandler,
    CheckMyStopIntentHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();