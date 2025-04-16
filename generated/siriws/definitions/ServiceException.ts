import { LineRef } from "./LineRef";
import { DirectionRef } from "./DirectionRef";
import { StopPointRef } from "./StopPointRef";

/**
 * ServiceException
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface ServiceException {
    /** s:dateTime */
    RecordedAtTime?: Date;
    /** LineRef */
    LineRef?: LineRef;
    /** DirectionRef */
    DirectionRef?: DirectionRef;
    /** StopPointRef */
    StopPointRef?: StopPointRef;
    /** ServiceExceptionEnumeration|s:string|beforeFirstJourney,afterLastJourney,noServiceToday,transportTemporarilySuspended,transportLongtermSuspended,transportSeverlyDisrupted,realtimeDataNotAvailable,realtimeDataAvailable */
    ServiceStatus?: string;
    /** s:string */
    Notice?: Array<string>;
    /** s:string */
    SituationRef?: string;
}
