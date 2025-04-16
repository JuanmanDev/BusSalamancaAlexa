import { StopPointRef } from "./StopPointRef";
import { ArrivalStopAssignment1 } from "./ArrivalStopAssignment1";
import { OperatorRef } from "./OperatorRef";
import { TargetedInterchange } from "./TargetedInterchange";
import { FromServiceJourneyInterchange } from "./FromServiceJourneyInterchange";
import { ToServiceJourneyInterchange } from "./ToServiceJourneyInterchange";
import { RequestExtension } from "./RequestExtension";

/**
 * DatedCall
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface DatedCall {
    /** StopPointRef */
    StopPointRef?: StopPointRef;
    /** s:positiveInteger */
    VisitNumber?: string;
    /** s:positiveInteger */
    Order?: string;
    /** s:string */
    StopPointName?: Array<string>;
    /** s:boolean */
    TimingPoint?: boolean;
    /** s:boolean */
    BoardingStretch?: boolean;
    /** s:boolean */
    RequestStop?: boolean;
    /** s:string */
    DestinationDisplay?: Array<string>;
    /** s:string */
    CallNote?: Array<string>;
    /** s:dateTime */
    AimedArrivalTime?: Date;
    /** s:string */
    ArrivalPlatformName?: string;
    /** ArrivalBoardingActivityEnumeration|s:string|alighting,noAlighting,passThru */
    ArrivalBoardingActivity?: string;
    /** ArrivalStopAssignment */
    ArrivalStopAssignment?: ArrivalStopAssignment1;
    /** ArrivalOperatorRefs[] */
    ArrivalOperatorRefs?: Array<OperatorRef>;
    /** s:dateTime */
    AimedDepartureTime?: Date;
    /** s:string */
    DeparturePlatformName?: string;
    /** DepartureBoardingActivityEnumeration|s:string|boarding,noBoarding,passThru */
    DepartureBoardingActivity?: string;
    /** DepartureStopAssignment */
    DepartureStopAssignment?: ArrivalStopAssignment1;
    /** DepartureOperatorRefs[] */
    DepartureOperatorRefs?: Array<OperatorRef>;
    /** s:dateTime */
    AimedLatestPassengerAccessTime?: Date;
    /** s:duration */
    AimedHeadwayInterval?: string;
    /** TargetedInterchange[] */
    TargetedInterchange?: Array<TargetedInterchange>;
    /** FromServiceJourneyInterchange[] */
    FromServiceJourneyInterchange?: Array<FromServiceJourneyInterchange>;
    /** ToServiceJourneyInterchange[] */
    ToServiceJourneyInterchange?: Array<ToServiceJourneyInterchange>;
    /** Extensions */
    Extensions?: RequestExtension;
}
