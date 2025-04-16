import { VehicleMonitoringRef } from "./VehicleMonitoringRef";
import { ProgressBetweenStops } from "./ProgressBetweenStops";
import { MonitoredVehicleJourney1 } from "./MonitoredVehicleJourney1";
import { RequestExtension } from "./RequestExtension";

/**
 * VehicleActivity
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface VehicleActivity {
    /** s:dateTime */
    RecordedAtTime?: Date;
    /** s:NMTOKEN */
    ItemIdentifier?: string;
    /** s:dateTime */
    ValidUntilTime?: Date;
    /** VehicleMonitoringRef */
    VehicleMonitoringRef?: VehicleMonitoringRef;
    /** s:string */
    MonitoringName?: Array<string>;
    /** ProgressBetweenStops */
    ProgressBetweenStops?: ProgressBetweenStops;
    /** MonitoredVehicleJourney */
    MonitoredVehicleJourney?: MonitoredVehicleJourney1;
    /** s:string */
    VehicleActivityNote?: Array<string>;
    /** Extensions */
    Extensions?: RequestExtension;
}
