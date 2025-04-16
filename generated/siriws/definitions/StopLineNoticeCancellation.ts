import { ItemRef } from "./ItemRef";
import { MonitoringRef } from "./MonitoringRef";
import { LineRef } from "./LineRef";
import { DirectionRef } from "./DirectionRef";
import { RequestExtension } from "./RequestExtension";

/**
 * StopLineNoticeCancellation
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface StopLineNoticeCancellation {
    /** s:dateTime */
    RecordedAtTime?: Date;
    /** ItemRef */
    ItemRef?: ItemRef;
    /** MonitoringRef */
    MonitoringRef?: MonitoringRef;
    /** LineRef */
    LineRef?: LineRef;
    /** DirectionRef */
    DirectionRef?: DirectionRef;
    /** Extensions */
    Extensions?: RequestExtension;
}
