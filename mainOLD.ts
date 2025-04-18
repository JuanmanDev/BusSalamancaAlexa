import soap from "soap";
import { createClientAsync } from "./generated/siriws/client";
import { LinesDiscovery } from "./generated/siriws/definitions/LinesDiscovery";
import { Request2 } from "./generated/siriws/definitions/Request2";
import { Request3 } from "./generated/siriws/definitions/Request3";
import fetch from "node-fetch";
import { GetStopMonitoring } from "./generated/siriws/definitions/GetStopMonitoring";

const client = await createClientAsync("./SiriWS.xml");

const basicAuth = new soap.BasicAuthSecurity("siritest", "siritest");
client.setSecurity(basicAuth);

client.setEndpoint("http://95.63.53.46:8015/SIRI/SiriWS.asmx");

const date = "2025-04-16T22:59:39.000";

client.GetStopMonitoringAsync({
    request: {
        Request: {
            RequestTimestamp: date as any,
            MonitoringRef: "199",
        } as Request3,
        ServiceRequestInfo: {
            RequestTimestamp: date as any,
            AccountId: "siritest",
            AccountKey: "siritest",
        },
    } as Request2,
} as GetStopMonitoring).then((result) => {
    console.log("LinesDiscovery result:", result);
    console.log("LinesDiscovery result:", result?.[0]?.LinesDiscoveryResult?.Answer);
}
).catch((error) => {
    console.error("GetGeneralMessage error:", error);
});

const soapBody = `
<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/">
  <v:Header />
  <v:Body>
    <GetStopMonitoring xmlns="http://tempuri.org/">
      <request>
        <ServiceRequestInfo xmlns="">
          <n0:RequestTimestamp xmlns:n0="http://www.siri.org.uk/siri">
            2025-04-16T20:25:35.000
          </n0:RequestTimestamp>
          <n1:AccountId xmlns:n1="http://www.siri.org.uk/siri">
            siritest
          </n1:AccountId>
          <n2:AccountKey xmlns:n2="http://www.siri.org.uk/siri">
            siritest
          </n2:AccountKey>
        </ServiceRequestInfo>
        <Request version="2.0" xmlns="">
          <n3:RequestTimestamp xmlns:n3="http://www.siri.org.uk/siri">
            2025-04-16T20:25:35.000
          </n3:RequestTimestamp>
          <n4:MonitoringRef  xmlns:n4="http://www.siri.org.uk/siri">
            199
          </n4:MonitoringRef >
        </Request>
      </request>
    </GetStopMonitoring>
  </v:Body>
</v:Envelope>
`;

// async function fetchStopMonitoring() {
//     const response = await fetch("http://95.63.53.46:8015/SIRI/SiriWS.asmx", {
//         method: "POST",
//         headers: {
//             // "Accept-Encoding": "gzip",
//             // "Connection": "Keep-Alive",
//             "Content-Length": Buffer.byteLength(soapBody, "utf8").toString(),
//             "Content-Type": "text/xml;charset=utf-8",
//             "Host": "95.63.53.46:8015",
//             "SOAPAction": "http://tempuri.org/GetStopMonitoring",
//             "User-Agent": "ksoap2-android/2.6.0+"
//         },
//         body: soapBody
//     });
//     const text = await response.text();
//     console.log("SOAP Response:", text);
// }

// // Call the function if you want to test it
// fetchStopMonitoring();