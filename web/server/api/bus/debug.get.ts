import { fetchLines } from '../../utils/siri'
const SIRI_ENDPOINT = 'http://95.63.53.46:8015/SIRI/SiriWS.asmx'
const ACCOUNT_ID = 'siritest'
const ACCOUNT_KEY = 'siritest'

function getCurrentDateTime(): string {
    const now = new Date()
    const madridParts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Madrid',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
    }).formatToParts(now)
    const getPart = (type: string) => madridParts.find(p => p.type === type)?.value || '00'
    return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}:${getPart('second')}.000`
}

function buildRequest(inner: string) {
    const date = getCurrentDateTime()
    return `
<request>
    <Request version="2.0" xmlns="">
        <n0:RequestTimestamp xmlns:n0="http://www.siri.org.uk/siri">${date}</n0:RequestTimestamp>
        <n1:AccountId xmlns:n1="http://www.siri.org.uk/siri">${ACCOUNT_ID}</n1:AccountId>
        <n2:AccountKey xmlns:n2="http://www.siri.org.uk/siri">${ACCOUNT_KEY}</n2:AccountKey>
        ${inner}
    </Request>
</request>`
}

async function callSiri(operation: string, body: string) {
    const envelope = `
<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/">
    <v:Header />
    <v:Body><${operation} xmlns="http://tempuri.org/">${body}</${operation}></v:Body>
</v:Envelope>`

    const resp = await fetch(SIRI_ENDPOINT, {
        method: 'POST',
        headers: { 'User-Agent': 'ksoap2-android/2.6.0+', 'SOAPAction': `http://tempuri.org/${operation}`, 'Content-Type': 'text/xml;charset=utf-8' },
        body: Buffer.from(Buffer.from(envelope).toString('base64'), 'base64')
    })
    return await resp.text()
}

export default defineEventHandler(async (event) => {
    try {
        const lines = await fetchLines()
        return {
            count: lines.length,
            sample: lines[0],
            line1: lines.find(l => l.id === '1' || l.id === 1)
        }
    } catch (e) {
        return { error: String(e) }
    }
})
