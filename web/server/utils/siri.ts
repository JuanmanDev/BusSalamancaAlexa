/**
 * SIRI Service - Server-side utilities
 * Ported from siri/siri_service.ts for use in Nuxt server routes
 */

const SIRI_ENDPOINT = 'http://95.63.53.46:8015/SIRI/SiriWS.asmx'
const ACCOUNT_ID = 'siritest'
const ACCOUNT_KEY = 'siritest'

// Cache for vehicles
let vehiclesCache: { data: any[], timestamp: number } | null = null
const CACHE_TTL = 3000 // 3 seconds

function getCurrentDateTime(): string {
    const now = new Date()
    const madridParts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Madrid',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).formatToParts(now)

    const getPart = (type: string) => madridParts.find(p => p.type === type)?.value || '00'
    return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}:${getPart('second')}.000`
}

function buildSiriRequest(requestInnerXml: string = '', isDiscoveryRequest: boolean = false, version: string = '2.0'): string {
    const date = getCurrentDateTime()

    if (isDiscoveryRequest) {
        //... (keep rest identical)
        return `
<request>
    <Request version="${version}" xmlns="">
        <n0:RequestTimestamp xmlns:n0="http://www.siri.org.uk/siri">${date}</n0:RequestTimestamp>
        <n1:AccountId xmlns:n1="http://www.siri.org.uk/siri">${ACCOUNT_ID}</n1:AccountId>
        <n2:AccountKey xmlns:n2="http://www.siri.org.uk/siri">${ACCOUNT_KEY}</n2:AccountKey>
        ${requestInnerXml}
    </Request>
</request>`
    }

    return `
<request>
    <ServiceRequestInfo xmlns="">
        <n0:RequestTimestamp xmlns:n0="http://www.siri.org.uk/siri">${date}</n0:RequestTimestamp>
        <n1:AccountId xmlns:n1="http://www.siri.org.uk/siri">${ACCOUNT_ID}</n1:AccountId>
        <n2:AccountKey xmlns:n2="http://www.siri.org.uk/siri">${ACCOUNT_KEY}</n2:AccountKey>
    </ServiceRequestInfo>
    <Request version="${version}" xmlns="">
        <n3:RequestTimestamp xmlns:n3="http://www.siri.org.uk/siri">${date}</n3:RequestTimestamp>
        ${requestInnerXml}
    </Request>
</request>`
}

async function callSiriService(operation: string, requestXmlBody: string): Promise<any> {
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
</v:Envelope>`

    // Simplified: Send string directly (fetch handles utf-8)
    // Legacy code used double-encoding (base64 of utf-8 bytes?!), let's try direct first.
    // Wait, did legacy use base64?
    const base64Text = Buffer.from(soapEnvelope).toString('base64')
    const bodyBytes = Buffer.from(base64Text, 'base64') //-> This just reconstructs the buffer from base64. 
    // Effectively it was just Buffer.from(soapEnvelope), but roundabout?
    // EXCEPT if soapEnvelope had non-utf8 chars? No.
    // Let's try sending string directly.

    // HOWEVER, if the server expects specific encoding...
    // The previous code had `headers: { 'Content-Type': 'text/xml;charset=utf-8' }`

    const response = await fetch(SIRI_ENDPOINT, {
        method: 'POST',
        headers: {
            'User-Agent': 'ksoap2-android/2.6.0+',
            'SOAPAction': `http://tempuri.org/${operation}`,
            'Content-Type': 'text/xml;charset=utf-8',
        },
        body: bodyBytes,
    })

    if (!response.ok) {
        throw new Error(`SIRI service error: ${response.status} ${response.statusText}`)
    }

    const text = await response.text()
    return parseXmlResponse(text, operation)
}

function parseXmlResponse(xml: string, operation: string): any {
    // Simple regex-based XML parsing for server-side
    const resultRegex = new RegExp(`<${operation}Result[^>]*>([\\s\\S]*?)</${operation}Result>`, 'i')
    const resultMatch = xml.match(resultRegex)

    if (!resultMatch) {
        console.warn('No result found for', operation)
        return null
    }

    const resultXml = resultMatch[1] as string
    return xmlToJson(resultXml)
}


function xmlToJson(xml: string): any {
    const obj: Record<string, any> = {}

    // Match all XML tags with content
    const tagRegex = /<([a-zA-Z0-9:_]+)([^>]*)>([\s\S]*?)<\/\1>/g
    let match

    while ((match = tagRegex.exec(xml)) !== null) {
        const tagName = match[1]
        const content = match[3]

        if (!tagName || content === undefined) continue

        const localName = tagName.includes(':') ? tagName.split(':').pop()! : tagName

        // Check if content has nested tags
        let value: any
        // Stricter check: must contain < and look like a tag
        if (content.includes('<') && /<[a-zA-Z0-9:_]+[^>]*>/.test(content)) {
            value = xmlToJson(content)
            // If we expected nested object but got empty object, something might be wrong
            // checking if regex failed to match anything inside
            if (Object.keys(value).length === 0 && content.trim().length > 0) {
                // Fallback to string if parsing failed? 
                // value = content.trim(); 
            }
        } else {
            value = content.trim()
        }

        if (obj[localName] !== undefined) {
            if (!Array.isArray(obj[localName])) {
                obj[localName] = [obj[localName]]
            }
            obj[localName].push(value)
        } else {
            obj[localName] = value
        }
    }

    return obj
}

// --- Public API ---

export async function fetchLines() {
    const requestXml = buildSiriRequest('', true)
    const result = await callSiriService('LinesDiscovery', requestXml)

    const annotatedLines = result?.Answer?.AnnotatedLineRef
    if (!annotatedLines) return []

    const linesArray = Array.isArray(annotatedLines) ? annotatedLines : [annotatedLines]

    return linesArray.map((line: any) => {
        let directions: any[] = []

        if (line.Directions?.Direction) {
            const rawDirs = line.Directions.Direction
            const dirsArray = Array.isArray(rawDirs) ? rawDirs : [rawDirs]

            directions = dirsArray.map((d: any) => {
                let stops: any[] = []
                if (d.Stops?.StopPointInPattern) {
                    const rawStops = d.Stops.StopPointInPattern
                    const stopsArray = Array.isArray(rawStops) ? rawStops : [rawStops]

                    stops = stopsArray.map((s: any) => ({
                        id: s.StopPointRef,
                        order: parseInt(s.Order)
                    })).sort((a: any, b: any) => a.order - b.order)
                }

                return {
                    id: d.DirectionRef || '',
                    name: d.DirectionName || '',
                    stops
                }
            })
        }

        return {
            id: line.LineRef || '',
            name: line.LineName || '',
            destination: line.Destinations?.Destination?.DestinationName || '',
            directions
        }
    })
}

export async function fetchStops() {
    const requestXml = buildSiriRequest('', true)
    const result = await callSiriService('StopPointsDiscovery', requestXml)

    const annotatedStops = result?.Answer?.AnnotatedStopPointRef
    if (!annotatedStops) return []

    const stopsArray = Array.isArray(annotatedStops) ? annotatedStops : [annotatedStops]

    return stopsArray.map((stop: any) => {
        // Extract lines from Lines.LineDirection[].LineRef
        let lines: string[] = []

        if (stop.Lines?.LineDirection) {
            const lineDirections = Array.isArray(stop.Lines.LineDirection)
                ? stop.Lines.LineDirection
                : [stop.Lines.LineDirection]

            // Extract unique LineRef values
            const lineRefs = lineDirections
                .map((ld: any) => ld.LineRef)
                .filter(Boolean)

            // Deduplicate (same line can have multiple directions)
            lines = [...new Set(lineRefs)] as string[]
        }

        return {
            id: stop.StopPointRef || '',
            name: stop.StopName || '',
            latitude: stop.Location?.Latitude ? parseFloat(stop.Location.Latitude) : undefined,
            longitude: stop.Location?.Longitude ? parseFloat(stop.Location.Longitude) : undefined,
            lines,
        }
    })
}


export async function fetchArrivals(stopId: string) {
    const innerXml = `<n4:MonitoringRef xmlns:n4="http://www.siri.org.uk/siri">${stopId}</n4:MonitoringRef>`
    const requestXml = buildSiriRequest(innerXml, false)
    const result = await callSiriService('GetStopMonitoring', requestXml)

    const delivery = result?.Answer?.StopMonitoringDelivery
    if (!delivery) return []

    const visits = delivery.MonitoredStopVisit
    if (!visits) return []

    const visitsArray = Array.isArray(visits) ? visits : [visits]
    const now = new Date()

    return visitsArray.map((visit: any) => {
        const journey = visit.MonitoredVehicleJourney || {}
        const call = journey.MonitoredCall || {}

        const expectedTime = call.ExpectedArrivalTime || call.ExpectedDepartureTime
        const expectedDate = expectedTime ? new Date(expectedTime) : now
        const minutesRemaining = Math.max(0, Math.round((expectedDate.getTime() - now.getTime()) / 60000))

        return {
            lineId: journey.LineRef || '',
            lineName: journey.PublishedLineName || journey.LineRef || '',
            destination: journey.DestinationName || '',
            expectedArrivalTime: expectedDate.toISOString(),
            aimedArrivalTime: call.AimedArrivalTime || null,
            minutesRemaining,
            vehicleRef: journey.VehicleRef || null,
            location: journey.VehicleLocation ? {
                latitude: parseFloat(journey.VehicleLocation.Latitude),
                longitude: parseFloat(journey.VehicleLocation.Longitude)
            } : undefined
        }
    }).sort((a: any, b: any) => a.minutesRemaining - b.minutesRemaining)
}

export async function fetchVehicles(options: { vehicleRef?: string, lineRef?: string } = {}) {
    // Note: The SIRI endpoint seems to require a specific VehicleRef to return data.
    // Requests for all vehicles or just LineRef often return empty results with v2.0
    // and v1.4 seems to be required for VehicleMonitoring.

    // If no vehicleRef is provided, we might get an empty list, but we allow it 
    // in case the server behavior changes or allows broad queries in future.

    const { vehicleRef, lineRef } = options;
    const cacheKey = vehicleRef ? `vehicle_${vehicleRef}` : (lineRef ? `line_${lineRef}` : 'all');

    // We can't simple cache everything in one variable now, so we skip cache for specific queries
    // or we could implement a more complex cache. For now, let's keep the global cache ONLY for 'all'
    // but honestly, since 'all' doesn't work well, maybe we should just disable cache for now 
    // or only cache if someone calls it without args (legacy behavior attempt).

    // For specific vehicle, no caching for now to ensure real-time data

    let innerXml = '\n';
    if (vehicleRef) {
        innerXml += `      <VehicleRef xmlns="http://www.siri.org.uk/siri">${vehicleRef}</VehicleRef>\n`;
    }
    if (lineRef) {
        innerXml += `      <LineRef xmlns="http://www.siri.org.uk/siri">${lineRef}</LineRef>\n`;
    }

    innerXml += `      <VehicleMonitoringDetailLevel xmlns="http://www.siri.org.uk/siri">normal</VehicleMonitoringDetailLevel>\n`;
    innerXml += `      <MaximumVehicles xmlns="http://www.siri.org.uk/siri">100</MaximumVehicles>\n    `;

    // Use version 1.4 for VehicleMonitoring as discovered in debugging
    const requestXml = buildSiriRequest(innerXml, false, '1.4')

    const result = await callSiriService('GetVehicleMonitoring', requestXml)

    const delivery = result?.Answer?.VehicleMonitoringDelivery
    if (!delivery) return []

    const activities = delivery.VehicleActivity
    if (!activities) return []

    const activitiesArray = Array.isArray(activities) ? activities : [activities]

    const mappedVehicles = activitiesArray.map((activity: any) => {
        const journey = activity.MonitoredVehicleJourney || {}
        const location = journey.VehicleLocation || {}

        return {
            id: journey.VehicleRef || '',
            lineId: journey.LineRef || '',
            lineName: journey.PublishedLineName || journey.LineRef || '',
            latitude: location.Latitude ? parseFloat(location.Latitude) : 0,
            longitude: location.Longitude ? parseFloat(location.Longitude) : 0,
            bearing: journey.Bearing ? parseFloat(journey.Bearing) : undefined,
            delay: journey.Delay ? parseInt(journey.Delay) : undefined,
            destination: journey.DestinationName || '',
        }
    }).filter((v: any) => v.latitude !== 0 && v.longitude !== 0)

    // Update cache only if we fetched 'all' (conceptually), but since we know 'all' is broken
    // this might be dead code for the 'all' case until server is fixed.
    if (!vehicleRef && !lineRef && mappedVehicles.length > 0) {
        vehiclesCache = {
            data: mappedVehicles,
            timestamp: Date.now()
        }
    }

    return mappedVehicles
}

