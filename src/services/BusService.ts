import fetch, { BodyInit } from 'node-fetch';
import { DOMParser } from 'xmldom';
import { parseString } from 'xml2js';

export interface BusArrival {
    line: number;
    aimedArrivalTime: string;
    minutesRemaining: number;
}

export interface StopData {
    address: string;
    number: string;
}

export interface BusStopInfo {
    linesText: string;
    stopData: StopData;
    arrivalData: BusArrival[];
}

export class BusService {
    private static readonly SIRI_URL = "http://95.63.53.46:8015/SIRI/SiriWS.asmx";

    private getCurrentDateTime(): string {
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
        const milliseconds = "000";

        return `${year}-${month}-${day}T${hour}:${minute}:${second}.${milliseconds}`;
    }

    private stringToBase64(str: string) {
        return btoa(unescape(encodeURIComponent(str)));
    }

    private base64toBytesArray(base64: string) {
        return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    }

    private async xmlToJson(xml: string, options = {}) {
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

    public async fetchBusData(parada: number): Promise<string> {
        const date = this.getCurrentDateTime();
        const xmlString = `<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/"><v:Header /><v:Body><GetStopMonitoring xmlns="http://tempuri.org/"><request><ServiceRequestInfo xmlns=""><n0:RequestTimestamp xmlns:n0="http://www.siri.org.uk/siri">${date}</n0:RequestTimestamp><n1:AccountId xmlns:n1="http://www.siri.org.uk/siri">siritest</n1:AccountId><n2:AccountKey xmlns:n2="http://www.siri.org.uk/siri">siritest</n2:AccountKey></ServiceRequestInfo><Request version="2.0" xmlns=""><n3:RequestTimestamp xmlns:n3="http://www.siri.org.uk/siri">${date}</n3:RequestTimestamp><n4:MonitoringRef  xmlns:n4="http://www.siri.org.uk/siri">${parada}</n4:MonitoringRef ></Request></request></GetStopMonitoring></v:Body></v:Envelope>`;

        const base64Text = this.stringToBase64(xmlString);

        console.log(`[BusService] Starting fetch for stop ${parada} at ${new Date().toISOString()}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

        try {
            const response = await fetch(BusService.SIRI_URL, {
                headers: {
                    "User-Agent": "ksoap2-android/2.6.0+",
                    "SOAPAction": "http://tempuri.org/GetStopMonitoring",
                    "Content-Type": "text/xml;charset=utf-8",
                    "Accept-Encoding": "gzip",
                },
                body: this.base64toBytesArray(base64Text) as BodyInit,
                method: "POST",
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            console.log(`[BusService] Response received. Status: ${response.status}`);

            if (response.status !== 200) {
                throw new Error('Network response was not ok. ' + response.statusText + ' ' + response.status);
            }
            return response.text();
        } catch (error) {
            clearTimeout(timeoutId);
            console.error(`[BusService] Fetch error: ${error}`);
            throw error;
        }
    }

    private getArrivalTimesWithMinutes(jsonData: any): BusArrival[] {
        try {
            const visits = jsonData?.["soap:Envelope"]?.["soap:Body"]?.GetStopMonitoringResponse?.GetStopMonitoringResult?.Answer?.StopMonitoringDelivery?.MonitoredStopVisit;
            if (!visits) return [];

            // Get current time in Madrid timezone
            const nowMadrid = new Date(
                new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' })
            ).getTime();

            const results: BusArrival[] = [];

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
                            line: parseInt(lineRef, 10),
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

    private formatArrivalData(arrivalData: BusArrival[]): string {
        return arrivalData.map(item => {
            if (item.minutesRemaining < 2) {
                return `Línea ${item.line} llega en menos de un minuto. `;
            } else {
                return `Línea ${item.line} llega en ${item.minutesRemaining} minutos. `;
            }
        }).join('\n');
    }

    private getStopDataResult(jsonResult: any): StopData {
        const visits = jsonResult?.["soap:Envelope"]?.["soap:Body"]?.GetStopMonitoringResponse?.GetStopMonitoringResult?.Answer?.StopMonitoringDelivery?.MonitoredStopVisit;
        const firstVisit = Array.isArray(visits) ? visits[0] : visits;
        return {
            address: firstVisit?.MonitoredVehicleJourney?.MonitoredCall?.StopPointName || '',
            number: firstVisit?.MonitoredVehicleJourney?.MonitoredCall?.StopPointRef || '',
        };
    }

    public async getStopInfo(parada: number): Promise<BusStopInfo | string> {
        try {
            const xmlText = await this.fetchBusData(parada);
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");
            const jsonResult: any = await this.xmlToJson(xmlDoc as unknown as string);

            const arrivalData = this.getArrivalTimesWithMinutes(jsonResult);
            const linesText = this.formatArrivalData(arrivalData);
            const stopData = this.getStopDataResult(jsonResult);

            return {
                linesText,
                stopData,
                arrivalData
            };
        } catch (error) {
            console.error('[BusService] Error getting stop info:', error);
            return "No hay información disponible para la parada seleccionada en estos momentos.";
        }
    }

    public async getStopName(parada: number): Promise<string> {
        try {
            const xmlText = await this.fetchBusData(parada);
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");
            const jsonResult: any = await this.xmlToJson(xmlDoc as unknown as string);

            const stopData = this.getStopDataResult(jsonResult);
            return stopData.address;
        } catch (error) {
            return "";
        }
    }
}
