import { MonitoringRef } from "./MonitoringRef";
import { ClearDownRef } from "./ClearDownRef";
import { MonitoredVehicleJourney } from "./MonitoredVehicleJourney";
import { FacilityRef } from "./FacilityRef";
import { RequestExtension } from "./RequestExtension";

/**
 * MonitoredStopVisit
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface MonitoredStopVisit {
    /** s:dateTime */
    RecordedAtTime?: Date;
    /** s:NMTOKEN */
    ItemIdentifier?: string;
    /** s:dateTime */
    ValidUntilTime?: Date;
    /** MonitoringRef */
    MonitoringRef?: MonitoringRef;
    /** ClearDownRef */
    ClearDownRef?: ClearDownRef;
    /** MonitoredVehicleJourney */
    MonitoredVehicleJourney?: MonitoredVehicleJourney;
    /** s:string */
    StopVisitNote?: Array<string>;
    /** StopFacility */
    StopFacility?: FacilityRef;
    /** Extensions */
    Extensions?: RequestExtension;
}
