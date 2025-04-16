import { MonitoringRef } from "./MonitoringRef";
import { LineRef } from "./LineRef";
import { DirectionRef } from "./DirectionRef";
import { DeliveryVariant } from "./DeliveryVariant";
import { SituationRef } from "./SituationRef";
import { RequestExtension } from "./RequestExtension";

/**
 * StopLineNotice
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface StopLineNotice {
    /** s:dateTime */
    RecordedAtTime?: Date;
    /** s:NMTOKEN */
    ItemIdentifier?: string;
    /** MonitoringRef */
    MonitoringRef?: MonitoringRef;
    /** LineRef */
    LineRef?: LineRef;
    /** DirectionRef */
    DirectionRef?: DirectionRef;
    /** s:string */
    PublishedLineName?: Array<string>;
    /** s:string */
    LineNote?: Array<string>;
    /** DeliveryVariant[] */
    DeliveryVariant?: Array<DeliveryVariant>;
    /** SituationRef[] */
    SituationRef?: Array<SituationRef>;
    /** Extensions */
    Extensions?: RequestExtension;
}
