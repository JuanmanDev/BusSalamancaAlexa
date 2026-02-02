import { DOMParser } from 'xmldom';
import { parseString } from 'xml2js';
// const { DOMParser } = require('xmldom');
// const { parseString } = require('xml2js');

import fetch, { BodyInit } from 'node-fetch';

async function xmlToJson(xml: string, options = {}) {
    const defaultOptions = {
        explicitArray: false,
        trim: true,
        ignoreAttrs: false,
        mergeAttrs: true,
        ...options
    };
    return new Promise((resolve, reject) => {
        parseString(xml, defaultOptions, (err: any, result: unknown) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

function base64toBytesArray(base64: string) {
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function getArrivalTimesWithMinutes(jsonData: any) {
    try {
        const visits = jsonData?.["soap:Envelope"]?.["soap:Body"]?.GetStopMonitoringResponse?.GetStopMonitoringResult?.Answer?.StopMonitoringDelivery?.MonitoredStopVisit;
        if (!visits) return [];

        // Get current time in Madrid timezone
        const nowMadrid = new Date(
            new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' })
        ).getTime();

        const results: {
            line: number,
            aimedArrivalTime: string,
            minutesRemaining: number,
        }[] = [];

        (Array.isArray(visits) ? visits : [visits]).forEach(visit => {
            try {
                const journey = visit['MonitoredVehicleJourney'];
                if (!journey) return;
                const lineRef = journey['LineRef'];
                const call = journey['MonitoredCall'];
                if (!call) return;
                const aimedArrivalTimeStr = call['AimedArrivalTime'];
                if (!lineRef || !aimedArrivalTimeStr) return;

                const aimedArrivalTime = new Date(aimedArrivalTimeStr).getTime();
                if (isNaN(aimedArrivalTime)) return;

                const diffInMinutes = Math.round((aimedArrivalTime - nowMadrid) / (1000 * 60));
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

function stringToBase64(str: string) {
    return btoa(unescape(encodeURIComponent(str)));
}

export function getCurrentDateTime() {
    // Get the current date/time in Madrid timezone
    const now = new Date();

    // Get parts in Madrid timezone
    const madridParts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Madrid',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).formatToParts(now);

    const getPart = (type: string) => madridParts.find(p => p.type === type)?.value || '00';

    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');
    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = getPart('second');
    // Get milliseconds in Madrid by calculating the offset
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    // const madridOffset = -60; // Madrid is UTC+1 or UTC+2 (DST), but Date will handle DST
    // const madridNow = new Date(utc + (new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' })).split(',')[1].split(':')[0] * 3600000);
    const milliseconds = "000";

    return `${year}-${month}-${day}T${hour}:${minute}:${second}.${milliseconds}`;
}

async function fetchBusData(parada: number) {
    const date = getCurrentDateTime();
    //const xmlString = `<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://www.w3.org/2001/XMLSchema"><v:Header /><v:Body><GetStopMonitoring xmlns="http://tempuri.org/"><request><ServiceRequestInfo xmlns=""><n0:RequestTimestamp xmlns:n0="http://www.w3.org.uk/siri">${date}</n0:RequestTimestamp><n1:AccountId xmlns:n1="http://www.siri.org.uk/siri">siritest</n1:AccountId><n2:AccountKey xmlns:n2="http://www.siri.org.uk/siri">siritest</n2:AccountKey></ServiceRequestInfo><Request version="2.0" xmlns=""><n3:RequestTimestamp xmlns:n3="http://www.w3.org.uk/siri">${date}</n3:RequestTimestamp><n4:MonitoringRef  xmlns:n4="http://www.w3.org.uk/siri">${parada}</n4:MonitoringRef ></Request></request></GetStopMonitoring></v:Body></v:Envelope>`;
    const xmlString = `<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/"><v:Header /><v:Body><GetStopMonitoring xmlns="http://tempuri.org/"><request><ServiceRequestInfo xmlns=""><n0:RequestTimestamp xmlns:n0="http://www.siri.org.uk/siri">${date}</n0:RequestTimestamp><n1:AccountId xmlns:n1="http://www.siri.org.uk/siri">siritest</n1:AccountId><n2:AccountKey xmlns:n2="http://www.siri.org.uk/siri">siritest</n2:AccountKey></ServiceRequestInfo><Request version="2.0" xmlns=""><n3:RequestTimestamp xmlns:n3="http://www.siri.org.uk/siri">${date}</n3:RequestTimestamp><n4:MonitoringRef  xmlns:n4="http://www.siri.org.uk/siri">${parada}</n4:MonitoringRef ></Request></request></GetStopMonitoring></v:Body></v:Envelope>`;

    // console.debug('XML String:', xmlString);

    const base64Text = stringToBase64(xmlString);

    console.log(`[fetchBusData] Starting fetch for stop ${parada} at ${new Date().toISOString()}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s timeout

    try {
        const response = await fetch("http://95.63.53.46:8015/SIRI/SiriWS.asmx", {
            headers: {
                "User-Agent": "ksoap2-android/2.6.0+",
                "SOAPAction": "http://tempuri.org/GetStopMonitoring",
                "Content-Type": "text/xml;charset=utf-8",
                "Accept-Encoding": "gzip",
            },
            body: base64toBytesArray(base64Text) as BodyInit,
            method: "POST",
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        console.log(`[fetchBusData] Response received. Status: ${response.status}`);

        if (response.status !== 200) {
            throw new Error('Network response was not ok.' + response.statusText + ' ' + response.status);
        }
        return response.text();
    } catch (error) {
        clearTimeout(timeoutId);
        console.error(`[fetchBusData] Fetch error: ${error}`);
        throw error;
    }
}

interface StopMonitoringResponse {
    "soap:Envelope"?: {
        "soap:Body"?: {
            GetStopMonitoringResponse?: {
                GetStopMonitoringResult?: {
                    Answer?: {
                        StopMonitoringDelivery?: {
                            MonitoredStopVisit?: any;
                        };
                    };
                };
            };
        };
    };
}

async function parseBusXmlToJson(xmlText: string): Promise<StopMonitoringResponse> {
    //// console.debug(xmlText);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    return await xmlToJson(xmlDoc as unknown as string) as StopMonitoringResponse;
}

export function getStopPointName(jsonResult: any): string | undefined {
    const visits = jsonResult?.["soap:Envelope"]?.["soap:Body"]?.GetStopMonitoringResponse?.GetStopMonitoringResult?.Answer?.StopMonitoringDelivery?.MonitoredStopVisit;
    const firstVisit = Array.isArray(visits) ? visits[0] : visits;
    return firstVisit?.MonitoredVehicleJourney?.MonitoredCall?.StopPointName;
}

export function getStopData(jsonResult: any) {
    const visits = jsonResult?.["soap:Envelope"]?.["soap:Body"]?.GetStopMonitoringResponse?.GetStopMonitoringResult?.Answer?.StopMonitoringDelivery?.MonitoredStopVisit;
    const firstVisit = Array.isArray(visits) ? visits[0] : visits;
    return {
        address: firstVisit?.MonitoredVehicleJourney?.MonitoredCall?.StopPointName,
        number: firstVisit?.MonitoredVehicleJourney?.MonitoredCall?.StopPointRef,
    }
}

function formatArrivalData(arrivalData: any[]) {
    return arrivalData.map(item => {
        if (item.minutesRemaining < 2) {
            return `Línea ${item.line} llega en menos de un minuto. `;
        } else {
            return `Línea ${item.line} llega en ${item.minutesRemaining} minutos. `;
        }
    }).join('\n');
}

export default async function main(parada: number = 199) {
    try {
        const xmlText = await fetchBusData(parada);
        // console.debug(xmlText);

        const jsonResult = await parseBusXmlToJson(xmlText);
        // console.debug(jsonResult);

        const visits = jsonResult?.["soap:Envelope"]?.["soap:Body"]?.GetStopMonitoringResponse?.GetStopMonitoringResult?.Answer?.StopMonitoringDelivery?.MonitoredStopVisit;
        // console.debug(visits);

        const arrivalData = getArrivalTimesWithMinutes(jsonResult);
        // console.debug(arrivalData);

        const result = formatArrivalData(arrivalData);
        // console.debug(result);

        return result;
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }
    return "No hay información disponible para la parada seleccionada en estos momentos.";
}

export async function getStopInfo(parada: number) {

    try {
        const xmlText = await fetchBusData(parada);
        // console.debug(xmlText);

        const jsonResult = await parseBusXmlToJson(xmlText);
        // console.debug(jsonResult);

        const stopPointName = getStopPointName(jsonResult);
        // console.debug(stopPointName);

        return stopPointName;
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }
    return "";
}


export async function dataStructured(parada: number = 199) {
    try {
        const xmlText = await fetchBusData(parada);
        console.debug(xmlText);

        const jsonResult = await parseBusXmlToJson(xmlText);
        // console.debug(jsonResult);

        const visits = jsonResult?.["soap:Envelope"]?.["soap:Body"]?.GetStopMonitoringResponse?.GetStopMonitoringResult?.Answer?.StopMonitoringDelivery?.MonitoredStopVisit;
        //console.debug(visits);

        const arrivalData = getArrivalTimesWithMinutes(jsonResult);
        // console.debug(arrivalData);

        const result = formatArrivalData(arrivalData);
        // console.debug(result);


        const stopPointName = getStopData(jsonResult);
        // console.debug(stopPointName);

        return {
            linesText: result,
            stopData: stopPointName,
            arrivalData: arrivalData,
        }
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }
    return "No hay información disponible para la parada seleccionada en estos momentos.";
}
