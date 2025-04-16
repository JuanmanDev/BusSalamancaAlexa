import { MonitoringRef } from "./MonitoringRef";
import { StopPointRef } from "./StopPointRef";
import { SituationRef } from "./SituationRef";
import { RequestExtension } from "./RequestExtension";

/**
 * StopNotice
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface StopNotice {
    /** s:dateTime */
    RecordedAtTime?: Date;
    /** s:NMTOKEN */
    ItemIdentifier?: string;
    /** MonitoringRef */
    MonitoringRef?: MonitoringRef;
    /** StopPointRef */
    StopPointRef?: StopPointRef;
    /** SituationRef[] */
    SituationRef?: Array<SituationRef>;
    /** Extensions */
    Extensions?: RequestExtension;
}
