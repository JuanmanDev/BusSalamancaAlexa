import { getCurrentDateTime, stringToBase64, base64toBytesArray } from './src/fetch';
import fetch from 'node-fetch';

async function testFetch(parada: number) {
    const date = getCurrentDateTime();
    const xmlString = `<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/"><v:Header /><v:Body><GetStopMonitoring xmlns="http://tempuri.org/"><request><ServiceRequestInfo xmlns=""><n0:RequestTimestamp xmlns:n0="http://www.siri.org.uk/siri">${date}</n0:RequestTimestamp><n1:AccountId xmlns:n1="http://www.siri.org.uk/siri">siritest</n1:AccountId><n2:AccountKey xmlns:n2="http://www.siri.org.uk/siri">siritest</n2:AccountKey></ServiceRequestInfo><Request version="2.0" xmlns=""><n3:RequestTimestamp xmlns:n3="http://www.siri.org.uk/siri">${date}</n3:RequestTimestamp><n4:MonitoringRef  xmlns:n4="http://www.siri.org.uk/siri">${parada}</n4:MonitoringRef ></Request></request></GetStopMonitoring></v:Body></v:Envelope>`;

    console.log('Sending request for stop:', parada);
    console.log('Date:', date);

    // Convert string to base64 same as in fetch.ts
    // In node environment, btoa/atob might need polyfill if not global or imported.
    // src/fetch.ts uses strict 'node-fetch', let's check imports.
    // It seems src/fetch.ts relies on 'btoa' being available globally?
    // Node.js > 16 has btoa/atob global.
    const base64Text = btoa(unescape(encodeURIComponent(xmlString)));

    const start = Date.now();
    try {
        const response = await fetch("http://95.63.53.46:8015/SIRI/SiriWS.asmx", {
            headers: {
                "User-Agent": "ksoap2-android/2.6.0+",
                "SOAPAction": "http://tempuri.org/GetStopMonitoring",
                "Content-Type": "text/xml;charset=utf-8",
                "Accept-Encoding": "gzip",
            },
            body: Uint8Array.from(atob(base64Text), (c) => c.charCodeAt(0)),
            method: "POST"
        });
        const duration = Date.now() - start;
        console.log(`Response status: ${response.status}`);
        console.log(`Duration: ${duration}ms`);
        const text = await response.text();
        console.log('Response length:', text.length);
    } catch (e) {
        console.error('Fetch failed:', e);
    }
}

testFetch(199);
