import fetch, { BodyInit } from 'node-fetch';
import { parseString } from 'xml2js';

// --- Shared Helpers ---

/**
 * Converts a string to Base64 (used for raw XML if needed, though SOAP usually sends XML as text).
 * Keeping compatibility with existing fetch.ts which uses base64? 
 * NOTE: The existing fetch.ts base64 encodes the ENTIRE XML string. 
 * This is unusual for standard SOAP but we will respect the pattern if that's how the server requires it.
 */
function stringToBase64(str: string): string {
    return btoa(unescape(encodeURIComponent(str)));
}

function base64toBytesArray(base64: string): Uint8Array {
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

export function getCurrentDateTime(): string {
    // Return ISO string in Madrid time roughly, or just ISO string.
    // SIRI often expects specific format. 
    // Reusing logic from fetch.ts for consistency
    const now = new Date();
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
    return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}:${getPart('second')}.000`;
}

async function xmlToJson(xml: string): Promise<any> {
    const defaultOptions = {
        explicitArray: false,
        trim: true,
        ignoreAttrs: false,
        mergeAttrs: true
    };
    return new Promise((resolve, reject) => {
        parseString(xml, defaultOptions, (err: any, result: unknown) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

// --- Interfaces ---

// Common SIRI types
export interface ServiceRequestInfo {
    RequestTimestamp?: string;
    AccountId?: string;
    AccountKey?: string;
}

export interface RequestStructure {
    RequestTimestamp?: string;
    version?: string;
}

export interface StopMonitoringRequestParams {
    MonitoringRef: string; // Stop ID (e.g., "199")
    MaximumStopVisits?: number;
    PreviewInterval?: string; // e.g. "PT1H"
}

export interface VehicleMonitoringRequestParams {
    VehicleMonitoringRef?: string;
    LineRef?: string;
}

export interface LinesDiscoveryRequestParams {
    // Usually empty or filter by bounding box
}

export interface StopPointsDiscoveryRequestParams {
    // Empty or bounding box
}

// Response Interfaces (Simplified for usability)
export interface SiriResponse<T> {
    result: T;
    rawJson: any;
}

// --- Main Service Class/Functions ---

const SIRI_ENDPOINT = "http://95.63.53.46:8015/SIRI/SiriWS.asmx";
const ACCOUNT_ID = "siritest";
const ACCOUNT_KEY = "siritest";

/**
 * Generic function to call SIRI Web Service
 * @param operation The SOAP operation name (e.g., GetStopMonitoring)
 * @param requestXmlBody The inner XML body of the request
 */
async function callSiriSoapService(operation: string, requestXmlBody: string): Promise<any> {
    const date = getCurrentDateTime();

    // Construct the SOAP Envelope
    // Note: The namespaces here are critical. Based on SiriWS.xml and fetch.ts.
    // fetch.ts uses: xmlns:v="http://schemas.xmlsoap.org/soap/envelope/"
    // and body namespace: xmlns="http://tempuri.org/"

    const soapEnvelope = `
<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" 
            xmlns:d="http://www.w3.org/2001/XMLSchema" 
            xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" 
            xmlns:v="http://schemas.xmlsoap.org/soap/envelope/">
    <v:Header />
    <v:Body>
        <${operation} xmlns="http://tempuri.org/">
            ${requestXmlBody}
        </${operation}>
    </v:Body>
</v:Envelope>`;

    // Based on fetch.ts, the body is sent as bytes of the BASE64 string of the XML. 
    // This is VERY weird for a standard SOAP service, but if fetch.ts works, we must follow it.
    const base64Text = stringToBase64(soapEnvelope);
    const bodyBytes = base64toBytesArray(base64Text);

    console.log(`[SiriService] Calling ${operation}...`);

    const response = await fetch(SIRI_ENDPOINT, {
        headers: {
            "User-Agent": "ksoap2-android/2.6.0+",
            "SOAPAction": `http://tempuri.org/${operation}`,
            "Content-Type": "text/xml;charset=utf-8",
            "Accept-Encoding": "gzip",
        },
        body: bodyBytes as unknown as BodyInit, // Cast because node-fetch types might complain about Uint8Array
        method: "POST"
    });

    if (response.status !== 200) {
        throw new Error(`Service Call Failed: ${response.status} ${response.statusText}`);
    }

    const responseText = await response.text();
    const json = await xmlToJson(responseText);

    // Unwrap the SOAP Envelope to get the specific Result
    // Structure: soap:Envelope -> soap:Body -> [Operation]Response -> [Operation]Result
    const envelope = json?.["soap:Envelope"];
    const body = envelope?.["soap:Body"];
    const responseBody = body?.[`${operation}Response`];
    const result = responseBody?.[`${operation}Result`];

    return result || json; // Return Unwrap result if found, else full JSON
}

/**
 * Helper to build the SIRI Request XML.
 * Handles both Standard requests (with ServiceRequestInfo) and Discovery requests (auth inside Request).
 * 
 * @param requestInnerXml The inner XML elements specific to the operation (e.g. MonitoringRef)
 * @param isDiscoveryRequest If true, places auth credentials inside Request instead of ServiceRequestInfo
 */
function buildSiriRequest(requestInnerXml: string = "", isDiscoveryRequest: boolean = false): string {
    const date = getCurrentDateTime();
    const xmlns = 'xmlns:n0="http://www.siri.org.uk/siri" xmlns:n1="http://www.siri.org.uk/siri" xmlns:n2="http://www.siri.org.uk/siri" xmlns:n3="http://www.siri.org.uk/siri" xmlns:n4="http://www.siri.org.uk/siri"';

    if (isDiscoveryRequest) {
        // Discovery: Auth inside Request, no ServiceRequestInfo
        return `
<request>
    <Request version="2.0" xmlns="">
        <n0:RequestTimestamp xmlns:n0="http://www.siri.org.uk/siri">${date}</n0:RequestTimestamp>
        <n1:AccountId xmlns:n1="http://www.siri.org.uk/siri">${ACCOUNT_ID}</n1:AccountId>
        <n2:AccountKey xmlns:n2="http://www.siri.org.uk/siri">${ACCOUNT_KEY}</n2:AccountKey>
        ${requestInnerXml}
    </Request>
</request>`;
    } else {
        // Standard: Auth in ServiceRequestInfo, separate Request
        return `
<request>
    <ServiceRequestInfo xmlns="">
        <n0:RequestTimestamp xmlns:n0="http://www.siri.org.uk/siri">${date}</n0:RequestTimestamp>
        <n1:AccountId xmlns:n1="http://www.siri.org.uk/siri">${ACCOUNT_ID}</n1:AccountId>
        <n2:AccountKey xmlns:n2="http://www.siri.org.uk/siri">${ACCOUNT_KEY}</n2:AccountKey>
    </ServiceRequestInfo>
    <Request version="2.0" xmlns="">
        <n3:RequestTimestamp xmlns:n3="http://www.siri.org.uk/siri">${date}</n3:RequestTimestamp>
        ${requestInnerXml}
    </Request>
</request>`;
    }
}

// --- Specific Service Methods ---

/**
 * Get Stop Monitoring (Arrival Times)
 * Retrieves the arrival times for a specific stop.
 * 
 * @param stopCode The stop code (e.g. 199)
 * @returns {Promise<any>} The StopMonitoringResult object containing the Answer with MonitoredStopVisit.
 * @example
 * const data = await getStopMonitoring(199);
 * const visits = data.Answer.StopMonitoringDelivery.MonitoredStopVisit;
 */
export async function getStopMonitoring(stopCode: number | string) {
    const innerXml = `<n4:MonitoringRef xmlns:n4="http://www.siri.org.uk/siri">${stopCode}</n4:MonitoringRef>`;
    const requestXml = buildSiriRequest(innerXml, false);
    return await callSiriSoapService("GetStopMonitoring", requestXml);
}

/**
 * Get Vehicle Monitoring (Live vehicle positions)
 * Retrieves the positions of all vehicles or specific lines.
 * 
 * @returns {Promise<any>} The VehicleMonitoringResult object.
 * @example
 * const data = await getVehicleMonitoring();
 * const vehicles = data.Answer.VehicleMonitoringDelivery.VehicleActivity;
 */
export async function getVehicleMonitoring(lineRef?: string) {
    // requesting 'normal' detail level to get vehicle activity
    let innerXml = `<n4:VehicleMonitoringDetailLevel xmlns:n4="http://www.siri.org.uk/siri">normal</n4:VehicleMonitoringDetailLevel>`;
    if (lineRef) {
        innerXml += `<n4:LineRef xmlns:n4="http://www.siri.org.uk/siri">${lineRef}</n4:LineRef>`;
    }
    const requestXml = buildSiriRequest(innerXml, false);
    return await callSiriSoapService("GetVehicleMonitoring", requestXml);
}

/**
 * Lines Discovery (List all available lines)
 * Retrieves the list of available bus lines.
 * 
 * @returns {Promise<any>} The LinesDiscoveryResult object.
 * @example
 * const data = await getLinesDiscovery();
 * const lines = data.Answer.AnnotatedLineRef;
 * // Example line: { LineRef: "1", LineName: "CHINCHIBARRA - BUENOS AIRES" }
 */
export async function getLinesDiscovery() {
    const requestXml = buildSiriRequest("", true);
    return await callSiriSoapService("LinesDiscovery", requestXml);
}

/**
 * Stop Points Discovery (List all stops)
 * Retrieves the list of known stop points.
 * 
 * @returns {Promise<any>} The StopPointsDiscoveryResult object.
 * @example
 * const data = await getStopPointsDiscovery();
 * const stops = data.Answer.AnnotatedStopPointRef;
 * // Example stop: { StopPointRef: "1", StopName: "PZA. DEL POETA IGLESIAS, 17" }
 */
export async function getStopPointsDiscovery() {
    const requestXml = buildSiriRequest("", true);
    return await callSiriSoapService("StopPointsDiscovery", requestXml);
}

/**
 * Get Production Timetable (Planned schedule)
 * Retrieves the production timetable.
 * 
 * @returns {Promise<any>} The GetProductionTimetableResult object.
 */
export async function getProductionTimetable() {
    const requestXml = buildSiriRequest("", false);
    return await callSiriSoapService("GetProductionTimetable", requestXml);
}

/**
 * Get Stop Timetable
 * Retrieves the timetable for a specific stop.
 * 
 * @param stopCode The stop code (e.g. 199)
 * @returns {Promise<any>} The GetStopTimetableResult object.
 */
export async function getStopTimetable(stopCode: number | string) {
    const innerXml = `<n4:MonitoringRef xmlns:n4="http://www.siri.org.uk/siri">${stopCode}</n4:MonitoringRef>`;
    const requestXml = buildSiriRequest(innerXml, false);
    return await callSiriSoapService("GetStopTimetable", requestXml);
}

/**
 * Get General Message (Alerts, news)
 * Retrieves general messages from the service.
 * 
 * @returns {Promise<any>} The GetGeneralMessageResult object.
 */
export async function getGeneralMessage() {
    const requestXml = buildSiriRequest("", false);
    return await callSiriSoapService("GetGeneralMessage", requestXml);
}
