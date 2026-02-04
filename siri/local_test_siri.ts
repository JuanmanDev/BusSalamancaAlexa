import {
    getStopMonitoring,
    getVehicleMonitoring,
    getLinesDiscovery,
    getStopPointsDiscovery,
    getProductionTimetable,
    getStopTimetable,
    getGeneralMessage,
    getCurrentDateTime
} from './siri_service';

async function test() {
    console.log('--- Testing SiriWS Client ---');
    console.log('Time:', getCurrentDateTime());

    try {
        console.log('\n1. Testing GetStopMonitoring (Stop 199)...');
        const stopMon = await getStopMonitoring(199);
        console.log('Result:', JSON.stringify(stopMon, null, 2));
        // Example access check
        // console.log('Visits:', stopMon?.Answer?.StopMonitoringDelivery?.MonitoredStopVisit ? 'Found' : 'Not Found');
    } catch (e) {
        console.error('Error in GetStopMonitoring:', e);
    }

    try {
        console.log('\n2. Testing GetVehicleMonitoring...');
        const vehMon = await getVehicleMonitoring();
        console.log('Result:', JSON.stringify(vehMon, null, 2));
    } catch (e) {
        console.error('Error in GetVehicleMonitoring:', e);
    }

    try {
        console.log('\n3. Testing LinesDiscovery...');
        const lines = await getLinesDiscovery();
        console.log('Result:', JSON.stringify(lines, null, 2));
    } catch (e) {
        console.error('Error in LinesDiscovery:', e);
    }

    try {
        console.log('\n4. Testing StopPointsDiscovery...');
        const stops = await getStopPointsDiscovery();
        console.log('Result:', JSON.stringify(stops, null, 2));
    } catch (e) {
        console.error('Error in StopPointsDiscovery:', e);
    }

    try {
        console.log('\n5. Testing GetProductionTimetable...');
        const prodTime = await getProductionTimetable();
        console.log('Result:', JSON.stringify(prodTime, null, 2));
    } catch (e) {
        console.error('Error in GetProductionTimetable:', e);
    }

    try {
        console.log('\n6. Testing GetStopTimetable (Stop 199)...');
        const stopTime = await getStopTimetable(199);
        console.log('Result:', JSON.stringify(stopTime, null, 2));
    } catch (e) {
        console.error('Error in GetStopTimetable:', e);
    }

    try {
        console.log('\n7. Testing GetGeneralMessage...');
        const genMsg = await getGeneralMessage();
        console.log('Result:', JSON.stringify(genMsg, null, 2).substring(0, 500) + '...');
    } catch (e) {
        console.error('Error in GetGeneralMessage:', e);
    }
}

test();
