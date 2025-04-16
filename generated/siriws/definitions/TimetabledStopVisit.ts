import { MonitoringRef } from "./MonitoringRef";
import { TargetedVehicleJourney } from "./TargetedVehicleJourney";
import { RequestExtension } from "./RequestExtension";

/**
 * TimetabledStopVisit
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface TimetabledStopVisit {
    /** s:dateTime */
    RecordedAtTime?: Date;
    /** s:NMTOKEN */
    ItemIdentifier?: string;
    /** MonitoringRef */
    MonitoringRef?: MonitoringRef;
    /** TargetedVehicleJourney */
    TargetedVehicleJourney?: TargetedVehicleJourney;
    /** Extensions */
    Extensions?: RequestExtension;
}
