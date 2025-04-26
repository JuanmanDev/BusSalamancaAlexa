import {
    ErrorHandler,
    HandlerInput,
    RequestHandler,
    SkillBuilders,
  } from 'ask-sdk-core';
import {
  Response,
  SessionEndedRequest,
} from 'ask-sdk-model';
import main, { getStopInfo } from './fetch.js';
import AWS from 'aws-sdk';
import Alexa from 'ask-sdk-core';

const DOCUMENT_ID = "AbreBusSalamanca";

const datasource = {
    "headlineTemplateData": {
        "type": "object",
        "objectId": "headlineSample",
        "properties": {
            "backgroundImage": {
                "contentDescription": null,
                "smallSourceUrl": null,
                "largeSourceUrl": null,
                "sources": [
                    {
                        "url": "",
                        "size": "large"
                    }
                ]
            },
            "textContent": {
                "primaryText": {
                    "type": "PlainText",
                    "text": "Línea 9 llega en 5 minutos. Línea 7 llega en 15 minutos."
                }
            },
            "logoUrl": "https://m.media-amazon.com/images/I/41E21ldSofL.png",
            "hintText": "Prueba, \"Alexa, abre Bus Salamanca y dime cuál es mi parada\""
        }
    }
};

const createDirectivePayload = (aplDocumentId: string, dataSources = {}, tokenId = "documentToken") => {
    return {
        type: "Alexa.Presentation.APL.RenderDocument",
        token: tokenId,
        document: {
            type: "Link",
            src: "doc://alexa/apl/documents/" + aplDocumentId
        },
        datasources: dataSources
    }
};

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'BusSalamanca'; // Replace with your table name

// Make sure this matches your DynamoDB table's partition key name
const DYNAMO_KEY_NAME = 'BusSalamanca'; // <-- Change this if your key is not 'userId'

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
      }

      // 3. Respond based on whether a stop is associated
      let speechText: string;
      if (stopInfo) {
        speechText = `Tienes la parada guardada: ${stopInfo}.`;
        let text = await main(Number(stopInfo)) as string; // Assuming stopInfo is a number

        // Add APL directive if supported
        if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
          const aplDirective = createDirectivePayload(DOCUMENT_ID, datasource);
          handlerInput.responseBuilder.addDirective(aplDirective);
        }

        return handlerInput.responseBuilder
          .speak(text)
          .reprompt(text)
          .withSimpleCard(`Próximas línas de autobús (Parada ${stopInfo}):`, text)
          .getResponse();
      } else {
        speechText = 'No tienes ninguna parada guardada. Puedes decir Abre Bus Salamanca y guarda la parada 199 para memorizar tu parada, puedes consultar las paradas en la web salamancadetransportes.com , también puedes consultar una parada en específico diciendo abre Bus Salamanca y revisa la parada 199.';
        
        // Add APL directive if supported
        if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
          const aplDirective = createDirectivePayload(DOCUMENT_ID, datasource);
          handlerInput.responseBuilder.addDirective(aplDirective);
        }

        return handlerInput.responseBuilder
          .speak(speechText)
          .withSimpleCard("Bus Salamanca:", speechText)
          .getResponse();
      }
    } catch (error) {
      console.error(error);
      return handlerInput.responseBuilder
        .speak("Ha ocurrido un error")
        .getResponse();
    }
  },
};

const AskWeatherIntentHandler : RequestHandler = {
  canHandle(handlerInput : HandlerInput) : boolean {
    const request = handlerInput.requestEnvelope.request;  
    return request.type === 'IntentRequest'
      && request.intent.name === 'AskWeatherIntent';
  },
  handle(handlerInput : HandlerInput) : Response {
    const speechText = 'The weather today is sunny.';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('The weather today is sunny.', speechText)
      .getResponse();
  },
};

const HelpIntentHandler : RequestHandler = {
  canHandle(handlerInput : HandlerInput) : boolean {
    const request = handlerInput.requestEnvelope.request;    
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput : HandlerInput) : Response {
    const speechText = 'You can ask me the weather!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('You can ask me the weather!', speechText)
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
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Goodbye!', speechText)
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
      speechText = `Tu parada guardada es la número ${stopInfo}.`;
      let text = await main(Number(stopInfo));

      return handlerInput.responseBuilder
        .speak(speechText)
        .withSimpleCard('Parada guardada', speechText)
        .getResponse();
    } else {
      speechText = 'No tienes ninguna parada guardada. Puedes decirme una para guardarla.';
    }

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Parada guardada', speechText)
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
      const speechText = 'No he entendido el número de parada que quieres consultar. Para consultar cualquier parada di Abre bus salamanca y consulta la parada 193.';
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .getResponse();
    }

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
        const speechText = 'No tienes ninguna parada guardada. Puedes decirme abre Bus Salamanca y guarda la parada 199 para poder informate de los autbuses que van a llegar a tu parada más cercana.';
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
      speechText = 'No tienes ninguna parada guardada. Puedes decirme abre Bus Salamanca y guarda la parada 199 para poder informate de los autbuses que van a llegar a tu parada más cercana.';
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
    AskWeatherIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    AddStopIntentHandler,
    CheckStopIntentHandler,
    CheckAnyStopIntentHandler,
    CheckMyStopIntentHandler, // <-- Register new intent handler here
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();