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
const IS_DEV = process.env.IS_DEV || '';

// Make sure this matches your DynamoDB table's partition key name
const DYNAMO_KEY_NAME = 'BusSalamanca';

// Helper to build the APL document with dynamic data
function buildCardDocument(stopNumber: string, stopAddress: string, lines: { line: number, minutesRemaining: number }[]) {
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
                      "headerTitle": IS_DEV + `BUS SALAMANCA - PARADA ${stopNumber} `,
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
  lines: { line: number, minutesRemaining: number }[]
}): Directive => {
  const cardDocument = buildCardDocument(stopNumber, stopAddress, lines);
  return {
    type: 'Alexa.Presentation.APL.RenderDocument',
    token: APL_TOKEN_CARD,
    document: cardDocument
  };
};


function buildCardTextDocument(title: string, subtitle: string | undefined, mainText: string, hint: string) {
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
    "mainTemplate": {
      "parameters": [
        "payload"
      ],
      "item": [
        {
          "type": "Container",
          "height": "100%",
          "width": "100%",
          "paddingTop": "16dp",
          "paddingLeft": "16dp",
          "paddingRight": "16dp",
          "paddingBottom": "16dp",
          "items": [
            {
              "type": "AlexaBackground",
              "backgroundImageSource": "https://bussalamanca.s3.eu-west-1.amazonaws.com/publicimages/BusSalamancaBackground.png",
              "backgroundBlur": false
            },

            {
              "type": "AlexaHeader",
              //"headerBackgroundColor": "black",
              "headerTitle": IS_DEV + title,
              "headerSubtitle": subtitle,
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
              "items": [
                {
                  "item": [
                    {
                      "text": mainText.replaceAll("\n", "<br>"),
                      "textAlign": "center",
                      "type": "Text"
                    }
                  ],
                  "type": "ScrollView",
                  "height": "100%",
                  "width": "100%"
                }
              ],
              "wrap": "wrap",
              "grow": 1,
              "type": "Container",
              "height": "200dp",
              "width": "100%",
              "paddingLeft": "16dp",
              "paddingRight": "16dp",
            },
            {
              "type": "AlexaFooter",
              "hintText": hint
            }
          ]
        }
      ]
    }
  };
}

// Update createDirectivePayload to use a single object parameter
const cardForText = (handlerInput: HandlerInput, {
  title, subtitle, mainText, hint
}: {
  title: string, subtitle?: string, mainText: string, hint: string
}): Response => {
  const cardDocument = buildCardTextDocument(title, subtitle, mainText, hint);

  if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
    handlerInput.responseBuilder.addDirective({
      type: 'Alexa.Presentation.APL.RenderDocument',
      token: APL_TOKEN_CARD,
      document: cardDocument
    });
  }


  return handlerInput.responseBuilder
    .speak(mainText)
    .withStandardCard(
      title + (subtitle ? " - " + subtitle : ""),
      mainText,
      "https://m.media-amazon.com/images/I/41E21ldSofL.png",
      "https://bussalamanca.s3.eu-west-1.amazonaws.com/publicimages/BusSalamancaBackground.png",
    )
    .withSimpleCard(title + (subtitle ? " - " + subtitle : ""), mainText)
    .getResponse();

};

async function returnInforResponse(handlerInput: HandlerInput, stopInfo: string, describeCurrentStop: boolean = false): Promise<Response> {
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

    // if data === []
    if (data.arrivalData.length === 0) {
      return cardForText(handlerInput, {
        title: "Bus Salamanca - Parada " + stopInfo,
        subtitle: "No hay información disponible",
        mainText: "No hay información disponible para la parada " + stopInfo + ".",
        hint: "Prueba \"Alexa, ¿Cuál es mi parada?\"."
      });
    }

    // Add APL directive if supported
    if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
      const aplDirective = createDirectivePayload({
        stopNumber: stopInfo,
        stopAddress: data.stopData.address, // Assuming text contains the address
        lines: data.arrivalData // Assuming text is a JSON string with lines info
      });
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
    console.error('Error in returnInforResponse:', error);
    return handlerInput.responseBuilder
      .speak("Ha ocurrido un error al procesar la información.")
      .withShouldEndSession(true)
      .getResponse();
  }
}

const LaunchRequestHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput): boolean {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'LaunchRequest';
  },
  async handle(handlerInput: HandlerInput): Promise<Response> {
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
        return await returnInforResponse(handlerInput, stopInfo);
      } else {

        const stopRandom1 = Math.floor(Math.random() * 250) + 1;
        const stopRandom2 = Math.floor(Math.random() * 250) + 1;
        const stopRandom3 = Math.floor(Math.random() * 250) + 1;
        speechText = "No sé de qué parada puedo informarte.\nPuedes decir Abre Bus Salamanca y guarda la parada " + stopRandom1 + " para memorizar tu parada y que te informe cada que vez que abras esta skill, puedes consultar las paradas en la web\nsalamancadetransportes.com\no en su aplicación oficial.\nTambién puedes consultar una parada en específico diciendo abre Bus Salamanca y revisa la parada " + stopRandom2 + ".";

        return cardForText(handlerInput, {
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
  },
};

const HelpIntentHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput): boolean {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput: HandlerInput): Response {
    const speechText = 'Puedo decirte cuanto tiempo queda para que lleguen los próximos autobuses. Puedes decirme, por ejemplo, abre Bus Salamanca y revisa la parada 199, o siemplemente "Alexa, Abre Bus Salamanca" si ya has guardado tu parada favorita.\nPara cambiar tu parada puede decir "Alexa, abre Bus Salamanca y guarda la parada 123", para saber que paradas hay puedes ir a la web salamancadetransportes.com o a su aplicación oficial.\nSi quieres saber más sobre la skill puedes decir "Alexa, abre Bus Salamanca y dime ayuda" para que te repita este mensaje.';


    return cardForText(handlerInput, {
      title: "Bus Salamanca",
      subtitle: "Ayuda",
      mainText: speechText,
      hint: "Prueba \"Alexa, ¿Cuándo llega el autbús?\"."
    });

  },
};

const CancelAndStopIntentHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput): boolean {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput: HandlerInput): Response {

    return cardForText(handlerInput, {
      title: "Bus Salamanca",
      subtitle: "Cerrando skill",
      mainText: "¡Adiós!\nEspero que llegues a tiempo al autobús.",
      hint: "Prueba \"Alexa, Abre Bus Salamanca\"."
    });
  },
};

const SessionEndedRequestHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput): boolean {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'SessionEndedRequest';
  },
  handle(handlerInput: HandlerInput): Response {
    console.log(`Session ended with reason: ${(handlerInput.requestEnvelope.request as SessionEndedRequest).reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const AddStopIntentHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput): boolean {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AddStopIntent';
  },
  async handle(handlerInput: HandlerInput): Promise<Response> {
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

      return cardForText(handlerInput, {
        title: "Bus Salamanca",
        subtitle: `Parada ${stopNumber} guardada`,
        mainText: `He guardado la parada número ${stopNumber} para tí.\nAhora solo necesitas decir abre Bus Salamanca para que te informe sobre esa parada.`,
        hint: "Prueba \"Alexa, cuando llega el autbús\"."
      });
    } catch (error) {
      console.error('DynamoDB put error:', error);
      const speechText = 'Ha ocurrido un error al guardar la parada.';
      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();
    }
  }
};

const CheckStopIntentHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput): boolean {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'CheckStopIntent';
  },
  handle: LaunchRequestHandler.handle, // Reuse the LaunchRequestHandler logic

};

const CheckAnyStopIntentHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput): boolean {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'CheckAnyStopIntent';
  },
  async handle(handlerInput: HandlerInput): Promise<Response> {
    const stopNumber = handlerInput.requestEnvelope.request.type === 'IntentRequest'
      ? handlerInput.requestEnvelope.request.intent.slots?.stopNumber?.value
      : undefined;

    if (!stopNumber) {
      const speechText = 'No he entendido el número de parada que quieres consultar. Para consultar cualquier parada dí Abre bus salamanca y consulta la parada 199.';

      return cardForText(handlerInput, {
        title: "Bus Salamanca",
        //subtitle: "No he entendido el número de parada que quieres consultar.",
        mainText: speechText,
        hint: `Prueba "Alexa, guarda la parada ${stopNumber}".`
      });

    }

    return await returnInforResponse(handlerInput, stopNumber);
  }
};

const CheckMyStopIntentHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput): boolean {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'CheckMyStopIntent';
  },
  async handle(handlerInput: HandlerInput): Promise<Response> {
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

      return cardForText(handlerInput, {
        title: "Bus Salamanca",
        subtitle: "Parada guardada " + stopInfo,
        mainText: speechText,
        hint: "Prueba \"Alexa, ¿Cuándo llega el autobús?\"."
      });
    } else {
      const stopRandom1 = Math.floor(Math.random() * 250) + 1;
      const stopRandom2 = Math.floor(Math.random() * 250) + 1;
      const stopRandom3 = Math.floor(Math.random() * 250) + 1;
      speechText = "No sé de qué parada puedo informarte.\nPuedes decir Abre Bus Salamanca y guarda la parada " + stopRandom1 + " para memorizar tu parada y que te informe cada que que abras esta skill, puedes consultar las paradas en la web\nsalamancadetransportes.com\no en su aplicación oficial.\nTambién puedes consultar una parada en específico diciendo abre Bus Salamanca y revisa la parada " + stopRandom2 + ".";

      return cardForText(handlerInput, {
        title: "Bus Salamanca",
        subtitle: "No hay parada configurada",
        mainText: speechText,
        hint: "Prueba \"Alexa, guarda la parada " + stopRandom3 + "\"."
      });

    }

  }
};

const ErrorHandler: ErrorHandler = {
  canHandle(handlerInput: HandlerInput, error: Error): boolean {
    return true;
  },
  handle(handlerInput: HandlerInput, error: Error): Response {
    console.error(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I don\'t understand your command. Please say it again.')
      .reprompt('Sorry, I don\'t understand your command. Please say it again.')
      .getResponse();
  }
};


let skill: Alexa.Skill;

export const handler = async (event: any, context: any) => {
  console.log(`REQUEST++++${JSON.stringify(event)}`);
  if (!skill) {
    skill = SkillBuilders.custom()
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
      .create();
  }

  const response = await skill.invoke(event, context);
  console.log(`RESPONSE++++${JSON.stringify(response)}`);

  return response;
};
