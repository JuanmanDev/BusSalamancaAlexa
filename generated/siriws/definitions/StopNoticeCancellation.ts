import { ItemRef } from "./ItemRef";
import { MonitoringRef } from "./MonitoringRef";
import { StopPointRef } from "./StopPointRef";
import { RequestExtension } from "./RequestExtension";

/**
 * StopNoticeCancellation
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface StopNoticeCancellation {
    /** s:dateTime */
    RecordedAtTime?: Date;
    /** ItemRef */
    ItemRef?: ItemRef;
    /** MonitoringRef */
    MonitoringRef?: MonitoringRef;
    /** StopPointRef */
    StopPointRef?: StopPointRef;
    /** s:dateTime */
    AppliesFromTime?: Date;
    /** Extensions */
    Extensions?: RequestExtension;
}
