import { Directive, Response, ui } from 'ask-sdk-model';
import { HandlerInput } from 'ask-sdk-core';
import * as Alexa from 'ask-sdk-core';

const IS_DEV = process.env.IS_DEV || '';
const APL_TOKEN_CARD = "BusSalamancaToken";

interface BusLineInfo {
    line: number;
    minutesRemaining: number;
}

export const APLUtils = {
    buildCardDocument(stopNumber: string, stopAddress: string, lines: BusLineInfo[]) {
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
    },

    createDirectivePayload(stopNumber: string, stopAddress: string, lines: BusLineInfo[]): Directive {
        const cardDocument = this.buildCardDocument(stopNumber, stopAddress, lines);
        return {
            type: 'Alexa.Presentation.APL.RenderDocument',
            token: APL_TOKEN_CARD,
            document: cardDocument
        };
    },

    buildCardTextDocument(title: string, subtitle: string | undefined, mainText: string, hint: string) {
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
    },

    cardForText(handlerInput: HandlerInput, {
        title, subtitle, mainText, hint
    }: {
        title: string, subtitle?: string, mainText: string, hint: string
    }): Response {
        const cardDocument = this.buildCardTextDocument(title, subtitle, mainText, hint);

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
    }
};
