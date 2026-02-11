/**
 * Test script to check SIRI data structure for Line 9
 */
import fetch from 'node-fetch'

const SIRI_ENDPOINT = "http://95.63.53.46:8015/SIRI/SiriWS.asmx"

async function testLineTimetable() {
    const now = new Date().toISOString().slice(0, -1)

    const soapEnvelope = `
<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" 
            xmlns:d="http://www.w3.org/2001/XMLSchema" 
            xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" 
            xmlns:v="http://schemas.xmlsoap.org/soap/envelope/">
    <v:Header />
    <v:Body>
        <GetEstimatedTimetable xmlns="http://tempuri.org/">
            <Request xmlns:n2="http://www.siri.org.uk/siri">
                <n1:ServiceRequestInfo xmlns:n1="http://www.siri.org.uk/siri">
                    <n1:RequestTimestamp>${now}</n1:RequestTimestamp>
                    <n1:AccountId>siritest</n1:AccountId>
                    <n1:AccountKey>siritest</n1:AccountKey>
                </n1:ServiceRequestInfo>
                <n1:Request version="1.1" xmlns:n1="http://www.siri.org.uk/siri">
                    <n1:RequestTimestamp>${now}</n1:RequestTimestamp>
                    <n1:Lines>
                        <n1:LineDirection>
                            <n1:LineRef>9</n1:LineRef>
                        </n1:LineDirection>
                    </n1:Lines>
                </n1:Request>
            </Request>
        </GetEstimatedTimetable>
    </v:Body>
</v:Envelope>`

    const base64Text = Buffer.from(soapEnvelope).toString('base64')
    const bodyBytes = Buffer.from(base64Text, 'base64')

    const response = await fetch(SIRI_ENDPOINT, {
        method: 'POST',
        headers: {
            'User-Agent': 'ksoap2-android/2.6.0+',
            'SOAPAction': 'http://tempuri.org/GetEstimatedTimetable',
            'Content-Type': 'text/xml;charset=utf-8',
        },
        body: bodyBytes,
    })

    const text = await response.text()
    console.log('Response length:', text.length)
    console.log('Response (first 5000 chars):')
    console.log(text.slice(0, 5000))
}

testLineTimetable().catch(console.error)
