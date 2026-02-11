
import { getVehicleMonitoring } from './siri_service';

// Mock the siri_service if not importing directly or if it needs modification
// But we can import it directly since it is a TS file. 
// We will modify siri_service.ts directly to allow passing inner XML for VehicleMonitoring.

async function main() {
    console.log('Testing GetVehicleMonitoring...');
    try {
        console.log('Testing GetVehicleMonitoring for Line 1...');
        const result = await getVehicleMonitoring('1');
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
