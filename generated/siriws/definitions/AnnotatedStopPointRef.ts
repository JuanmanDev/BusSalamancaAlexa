import { StopPointRef } from "./StopPointRef";
import { StopAreaRef } from "./StopAreaRef";
import { Features1 } from "./Features1";
import { Lines } from "./Lines";
import { VehicleLocation } from "./VehicleLocation";

/**
 * AnnotatedStopPointRef
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface AnnotatedStopPointRef {
    /** StopPointRef */
    StopPointRef?: StopPointRef;
    /** s:boolean */
    TimingPoint?: boolean;
    /** s:boolean */
    Monitored?: boolean;
    /** s:string */
    StopName?: Array<string>;
    /** StopAreaRef */
    StopAreaRef?: StopAreaRef;
    /** Features */
    Features?: Features1;
    /** Lines */
    Lines?: Lines;
    /** Location */
    Location?: VehicleLocation;
    /** s:anyURI */
    Url?: string;
}
