import { DOMParser } from 'xmldom';
import { parseString } from 'xml2js';
// const { DOMParser } = require('xmldom');
// const { parseString } = require('xml2js');

import fetch from 'node-fetch';



async function xmlToJson(xml, options = {}) {
    const defaultOptions = {
        explicitArray: false,
        trim: true,
        ignoreAttrs: false,
        mergeAttrs: true,
        ...options
    };
    return new Promise((resolve, reject) => {
        parseString(xml, defaultOptions, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

function base64toBytesArray(base64) {
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function getArrivalTimesWithMinutes(jsonData) {
    try {
        const visits = jsonData?.["soap:Envelope"]?.["soap:Body"]?.GetStopMonitoringResponse?.GetStopMonitoringResult?.Answer?.StopMonitoringDelivery?.MonitoredStopVisit;
        if (!visits) return [];

        const now = new Date();
        const results = [];

        (Array.isArray(visits) ? visits : [visits]).forEach(visit => {
            try {
                const journey = visit['MonitoredVehicleJourney'];
                if (!journey) return;
                const lineRef = journey['LineRef'];
                const call = journey['MonitoredCall'];
                if (!call) return;
                const aimedArrivalTimeStr = call['AimedArrivalTime'];
                if (!lineRef || !aimedArrivalTimeStr) return;

                const aimedArrivalTime = new Date(aimedArrivalTimeStr);
                if (isNaN(aimedArrivalTime.getTime())) return;

                const diffInMinutes = Math.round((aimedArrivalTime - now) / (1000 * 60));
                if (diffInMinutes >= 0) {
                    results.push({
                        line: lineRef,
                        aimedArrivalTime: aimedArrivalTimeStr,
                        minutesRemaining: diffInMinutes
                    });
                }
            } catch (e) {
                console.error('Error procesando visita:', e);
            }
        });

        return results.sort((a, b) => a.minutesRemaining - b.minutesRemaining);

    } catch (error) {
        console.error('Error procesando datos:', error);
        return [];
    }
}

function stringToBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
}

function getCurrentDateTime() {
    const now = new Date();
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
}

async function fetchBusData(parada) {
    const date = getCurrentDateTime();
    const xmlString = `<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/"><v:Header /><v:Body><GetStopMonitoring xmlns="http://tempuri.org/"><request><ServiceRequestInfo xmlns=""><n0:RequestTimestamp xmlns:n0="http://www.siri.org.uk/siri">${date}</n0:RequestTimestamp><n1:AccountId xmlns:n1="http://www.siri.org.uk/siri">siritest</n1:AccountId><n2:AccountKey xmlns:n2="http://www.siri.org.uk/siri">siritest</n2:AccountKey></ServiceRequestInfo><Request version="2.0" xmlns=""><n3:RequestTimestamp xmlns:n3="http://www.siri.org.uk/siri">${date}</n3:RequestTimestamp><n4:MonitoringRef  xmlns:n4="http://www.siri.org.uk/siri">${parada}</n4:MonitoringRef ></Request></request></GetStopMonitoring></v:Body></v:Envelope>`;


    const base64Text = stringToBase64(xmlString);

    const response = await fetch("http://95.63.53.46:8015/SIRI/SiriWS.asmx", {
        headers: {
            "User-Agent": "ksoap2-android/2.6.0+",
            "SOAPAction": "http://tempuri.org/GetStopMonitoring",
            "Content-Type": "text/xml;charset=utf-8",
            "Accept-Encoding": "gzip",
        },
        body: base64toBytesArray(base64Text),
        method: "POST"
    });

    if (response.status !== 200) {
        throw new Error('Network response was not ok.');
    }
    return response.text();
}

async function parseBusXmlToJson(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    return await xmlToJson(xmlDoc);
}

function formatArrivalData(arrivalData) {
    return arrivalData.map(item => {
        if (item.minutesRemaining < 2) {
            return `Línea ${item.line} llega en menos de un minuto. `;
        } else {
            return `Línea ${item.line} llega en ${item.minutesRemaining} minutos. `;
        }
    }).join('\n ');
}

async function main() {
    try {
        const parada = 199;
        const xmlText = await fetchBusData(parada);
        console.log(xmlText);

        const jsonResult = await parseBusXmlToJson(xmlText);
        console.log(jsonResult);

        const visits = jsonResult?.["soap:Envelope"]?.["soap:Body"]?.GetStopMonitoringResponse?.GetStopMonitoringResult?.Answer?.StopMonitoringDelivery?.MonitoredStopVisit;
        console.log(visits);

        const arrivalData = getArrivalTimesWithMinutes(jsonResult);
        console.log(arrivalData);

        const result = formatArrivalData(arrivalData);
        console.log(result);

        return result;
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }
}

// Adaptación para Alexa Skill
export const handler = async (event, context) => {
    try {
        // Extrae el número de parada desde el intent de Alexa, si existe
        let parada = 199;
        if (event.request && event.request.intent && event.request.intent.slots && event.request.intent.slots.Parada && event.request.intent.slots.Parada.value) {
            parada = event.request.intent.slots.Parada.value;
        }
        const xmlText = await fetchBusData(parada);
        const jsonResult = await parseBusXmlToJson(xmlText);
        const arrivalData = getArrivalTimesWithMinutes(jsonResult);
        const result = formatArrivalData(arrivalData);

        return {
            version: "1.0",
            response: {
                outputSpeech: {
                    type: "PlainText",
                    text: result || "No hay información disponible para esa parada."
                },
                shouldEndSession: true
            }
        };
    } catch (error) {
        return {
            version: "1.0",
            response: {
                outputSpeech: {
                    type: "PlainText",
                    text: "Ha ocurrido un error al obtener la información del autobús."
                },
                shouldEndSession: true
            }
        };
    }
};

// // Permite ejecutar como script para pruebas locales
// if (require.main === module) {
    main();
// }
