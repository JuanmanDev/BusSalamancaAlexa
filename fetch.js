import { DOMParser } from 'xmldom';

import { parseString } from 'xml2js';


function xmlToJson(xml, options = {}) {
  return new Promise((resolve, reject) => {
      const defaultOptions = {
          explicitArray: false, // Don't always create arrays for child elements
          trim: true,          // Trim whitespace
          ignoreAttrs: false,   // Include attributes
          mergeAttrs: true,    // Merge attributes with child elements
          ...options            // User-provided options override defaults
      };

      parseString(xml, defaultOptions, (err, result) => {
          if (err) {
              reject(err);
          } else {
              resolve(result);
          }
      });
  });
}

function base64toBytesArray(base64) {
      return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function getArrivalTimesWithMinutes(jsonData) {
    try {
        // // Descend into root if top-level is #document
        // if (jsonData['#document']) {
        //     jsonData = jsonData['#document'];
        // }

        // // Adapt to the XML structure with namespaces
        // const envelope = jsonData['soap:Envelope'] || jsonData['Envelope'];
        // if (!envelope) throw new Error('Estructura JSON inválida: falta Envelope');

        // const body = envelope['soap:Body'] || envelope['Body'];
        // if (!body) throw new Error('Estructura JSON inválida: falta Body');

        // // GetStopMonitoringResponse may have a namespace or not
        // const responseKey = Object.keys(body).find(k => k.endsWith('GetStopMonitoringResponse'));
        // const response = body[responseKey];
        // if (!response) throw new Error('Estructura JSON inválida: falta GetStopMonitoringResponse');

        // const resultKey = Object.keys(response).find(k => k.endsWith('GetStopMonitoringResult'));
        // const result = response[resultKey];
        // if (!result) throw new Error('Estructura JSON inválida: falta GetStopMonitoringResult');

        // // Answer may have a namespace or not
        // const answerKey = Object.keys(result).find(k => k.endsWith('Answer'));
        // const answer = result[answerKey];
        // if (!answer) throw new Error('Estructura JSON inválida: falta Answer');

        // // StopMonitoringDelivery may have a namespace or not
        // const deliveryKey = Object.keys(answer).find(k => k.endsWith('StopMonitoringDelivery'));
        // const delivery = answer[deliveryKey];
        // if (!delivery) return [];

        // MonitoredStopVisit may be array or object
        const visits = jsonData?.["soap:Envelope"]?.["soap:Body"]?.GetStopMonitoringResponse?.GetStopMonitoringResult?.Answer?.StopMonitoringDelivery?.MonitoredStopVisit
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

        // Ordenar por minutos restantes (ascendente)
        return results.sort((a, b) => a.minutesRemaining - b.minutesRemaining);

    } catch (error) {
        console.error('Error procesando datos:', error);
        return [];
    }
}

/**
 * Converts a string to base64 text.
 * @param {string} str - The input string.
 * @returns {string} - The base64 encoded string.
 */
function stringToBase64(str) {
    // Encode to UTF-8, then to base64
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

const date = getCurrentDateTime()
const parada = 199;
// Example usage:
const xmlString = `<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/"><v:Header /><v:Body><GetStopMonitoring xmlns="http://tempuri.org/"><request><ServiceRequestInfo xmlns=""><n0:RequestTimestamp xmlns:n0="http://www.siri.org.uk/siri">${date}</n0:RequestTimestamp><n1:AccountId xmlns:n1="http://www.siri.org.uk/siri">siritest</n1:AccountId><n2:AccountKey xmlns:n2="http://www.siri.org.uk/siri">siritest</n2:AccountKey></ServiceRequestInfo><Request version="2.0" xmlns=""><n3:RequestTimestamp xmlns:n3="http://www.siri.org.uk/siri">${date}</n3:RequestTimestamp><n4:MonitoringRef  xmlns:n4="http://www.siri.org.uk/siri">${parada}</n4:MonitoringRef ></Request></request></GetStopMonitoring></v:Body></v:Envelope>`;

const base64Text = stringToBase64(xmlString);
console.log(base64Text);
console.log(base64Text === "PHY6RW52ZWxvcGUgeG1sbnM6aT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEtaW5zdGFuY2UiIHhtbG5zOmQ9Imh0dHA6Ly93d3cudzMub3JnLzIwMDEvWE1MU2NoZW1hIiB4bWxuczpjPSJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy9zb2FwL2VuY29kaW5nLyIgeG1sbnM6dj0iaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvc29hcC9lbnZlbG9wZS8iPjx2OkhlYWRlciAvPjx2OkJvZHk+PEdldFN0b3BNb25pdG9yaW5nIHhtbG5zPSJodHRwOi8vdGVtcHVyaS5vcmcvIj48cmVxdWVzdD48U2VydmljZVJlcXVlc3RJbmZvIHhtbG5zPSIiPjxuMDpSZXF1ZXN0VGltZXN0YW1wIHhtbG5zOm4wPSJodHRwOi8vd3d3LnNpcmkub3JnLnVrL3NpcmkiPjIwMjUtMDQtMTZUMjI6NTk6MzkuMDAwPC9uMDpSZXF1ZXN0VGltZXN0YW1wPjxuMTpBY2NvdW50SWQgeG1sbnM6bjE9Imh0dHA6Ly93d3cuc2lyaS5vcmcudWsvc2lyaSI+c2lyaXRlc3Q8L24xOkFjY291bnRJZD48bjI6QWNjb3VudEtleSB4bWxuczpuMj0iaHR0cDovL3d3dy5zaXJpLm9yZy51ay9zaXJpIj5zaXJpdGVzdDwvbjI6QWNjb3VudEtleT48L1NlcnZpY2VSZXF1ZXN0SW5mbz48UmVxdWVzdCB2ZXJzaW9uPSIyLjAiIHhtbG5zPSIiPjxuMzpSZXF1ZXN0VGltZXN0YW1wIHhtbG5zOm4zPSJodHRwOi8vd3d3LnNpcmkub3JnLnVrL3NpcmkiPjIwMjUtMDQtMTZUMjI6NTk6MzkuMDAwPC9uMzpSZXF1ZXN0VGltZXN0YW1wPjxuNDpNb25pdG9yaW5nUmVmICB4bWxuczpuND0iaHR0cDovL3d3dy5zaXJpLm9yZy51ay9zaXJpIj4xOTk8L240Ok1vbml0b3JpbmdSZWYgPjwvUmVxdWVzdD48L3JlcXVlc3Q+PC9HZXRTdG9wTW9uaXRvcmluZz48L3Y6Qm9keT48L3Y6RW52ZWxvcGU+DQo=");

const orriginalText= "PHY6RW52ZWxvcGUgeG1sbnM6aT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEtaW5zdGFuY2UiIHhtbG5zOmQ9Imh0dHA6Ly93d3cudzMub3JnLzIwMDEvWE1MU2NoZW1hIiB4bWxuczpjPSJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy9zb2FwL2VuY29kaW5nLyIgeG1sbnM6dj0iaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvc29hcC9lbnZlbG9wZS8iPjx2OkhlYWRlciAvPjx2OkJvZHk+PEdldFN0b3BNb25pdG9yaW5nIHhtbG5zPSJodHRwOi8vdGVtcHVyaS5vcmcvIj48cmVxdWVzdD48U2VydmljZVJlcXVlc3RJbmZvIHhtbG5zPSIiPjxuMDpSZXF1ZXN0VGltZXN0YW1wIHhtbG5zOm4wPSJodHRwOi8vd3d3LnNpcmkub3JnLnVrL3NpcmkiPjIwMjUtMDQtMTZUMjI6NTk6MzkuMDAwPC9uMDpSZXF1ZXN0VGltZXN0YW1wPjxuMTpBY2NvdW50SWQgeG1sbnM6bjE9Imh0dHA6Ly93d3cuc2lyaS5vcmcudWsvc2lyaSI+c2lyaXRlc3Q8L24xOkFjY291bnRJZD48bjI6QWNjb3VudEtleSB4bWxuczpuMj0iaHR0cDovL3d3dy5zaXJpLm9yZy51ay9zaXJpIj5zaXJpdGVzdDwvbjI6QWNjb3VudEtleT48L1NlcnZpY2VSZXF1ZXN0SW5mbz48UmVxdWVzdCB2ZXJzaW9uPSIyLjAiIHhtbG5zPSIiPjxuMzpSZXF1ZXN0VGltZXN0YW1wIHhtbG5zOm4zPSJodHRwOi8vd3d3LnNpcmkub3JnLnVrL3NpcmkiPjIwMjUtMDQtMTZUMjI6NTk6MzkuMDAwPC9uMzpSZXF1ZXN0VGltZXN0YW1wPjxuNDpNb25pdG9yaW5nUmVmICB4bWxuczpuND0iaHR0cDovL3d3dy5zaXJpLm9yZy51ay9zaXJpIj4xOTk8L240Ok1vbml0b3JpbmdSZWYgPjwvUmVxdWVzdD48L3JlcXVlc3Q+PC9HZXRTdG9wTW9uaXRvcmluZz48L3Y6Qm9keT48L3Y6RW52ZWxvcGU+DQo=";

function xmlToJsonOLD(xml) {
  // Crear el objeto JSON resultante
  const result = {};

  // Si hay nodos hijos, procesarlos
  if (xml.children?.length > 0) {
      for (let i = 0; i < xml.children.length; i++) {
          const child = xml.children[i];
          const nodeName = child.nodeName;

          // Si el nodo ya existe, convertirlo en array
          if (result[nodeName] === undefined) {
              result[nodeName] = xmlToJson(child);
          } else {
              if (!(result[nodeName] instanceof Array)) {
                  result[nodeName] = [result[nodeName]];
              }
              result[nodeName].push(xmlToJson(child));
          }
      }
  } else {
      // Si no hay hijos, devolver el contenido del nodo
      return xml.textContent;
  }

  return result;
}

fetch("http://95.63.53.46:8015/SIRI/SiriWS.asmx", {
  "headers": {
"User-Agent": "ksoap2-android/2.6.0+",
"SOAPAction": "http://tempuri.org/GetStopMonitoring",
"Content-Type": "text/xml;charset=utf-8",
"Accept-Encoding": "gzip",
//"Content-Length": "878"
  },
  "body": base64toBytesArray(base64Text),
  "method": "POST"
}).then(response => {
  if (response.status === 200) {
    return response.text();
  } else {
    throw new Error('Network response was not ok.');
  }
}).then(async data => {   
  console.log(data); // Handle the response data here

  // Parsear el XML
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(data, "text/xml");

  // Convertir a JSON
  const jsonResult = await xmlToJson(xmlDoc);

  console.log(jsonResult); // Imprimir el resultado JSON

  console.log(jsonResult["soap:Envelope"]["soap:Body"].GetStopMonitoringResponse.GetStopMonitoringResult.Answer.StopMonitoringDelivery.MonitoredStopVisit);
  console.log(jsonResult["soap:Envelope"]["soap:Body"].GetStopMonitoringResponse.GetStopMonitoringResult.Answer.StopMonitoringDelivery.MonitoredStopVisit);

  const arrivalData = getArrivalTimesWithMinutes(jsonResult);

  console.log(arrivalData); // Imprimir el resultado JSON

  const result = arrivalData.map(item => {
    if (item.minutesRemaining < 2) {
      return `Línea ${item.line} llega en menos de un minuto. `
    } else {
      return `Línea ${item.line} llega en ${item.minutesRemaining} minutos. `
    }
  }).join('\n ');

  console.log(result); // Imprimir el resultado JSON

  return result; // Return the result if needed

}).catch(error => {
  console.error('There was a problem with the fetch operation:', error);
})

