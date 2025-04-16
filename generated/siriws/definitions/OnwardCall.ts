import { StopPointRef } from "./StopPointRef";
import { ExpectedDeparturePredictionQuality } from "./ExpectedDeparturePredictionQuality";
import { ArrivalStopAssignment } from "./ArrivalStopAssignment";
import { OperatorRef } from "./OperatorRef";
import { RequestExtension } from "./RequestExtension";

/**
 * OnwardCall
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface OnwardCall {
    /** StopPointRef */
    StopPointRef?: StopPointRef;
    /** s:positiveInteger */
    VisitNumber?: string;
    /** s:positiveInteger */
    Order?: string;
    /** s:string */
    StopPointName?: Array<string>;
    /** s:boolean */
    VehicleAtStop?: boolean;
    /** s:boolean */
    TimingPoint?: boolean;
    /** s:dateTime */
    AimedArrivalTime?: Date;
    /** s:dateTime */
    ExpectedArrivalTime?: Date;
    /** ExpectedArrivalPredictionQuality */
    ExpectedArrivalPredictionQuality?: ExpectedDeparturePredictionQuality;
    /** CallStatusEnumeration|s:string|onTime,early,delayed,cancelled,arrived,departed,missed,noReport,notExpected */
    ArrivalStatus?: string;
    /** s:string */
    ArrivalProximityText?: string;
    /** s:string */
    ArrivalPlatformName?: string;
    /** ArrivalBoardingActivityEnumeration|s:string|alighting,noAlighting,passThru */
    ArrivalBoardingActivity?: string;
    /** ArrivalStopAssignment */
    ArrivalStopAssignment?: ArrivalStopAssignment;
    /** ArrivalOperatorRefs[] */
    ArrivalOperatorRefs?: Array<OperatorRef>;
    /** s:dateTime */
    AimedDepartureTime?: Date;
    /** s:dateTime */
    ExpectedDepartureTime?: Date;
    /** s:dateTime */
    ProvisionalExpectedDepartureTime?: Date;
    /** s:dateTime */
    EarliestExpectedDepartureTime?: Date;
    /** ExpectedDeparturePredictionQuality */
    ExpectedDeparturePredictionQuality?: ExpectedDeparturePredictionQuality;
    /** s:dateTime */
    AimedLatestPassengerAccessTime?: Date;
    /** s:dateTime */
    ExpectedLatestPassengerAccessTime?: Date;
    /** CallStatusEnumeration|s:string|onTime,early,delayed,cancelled,arrived,departed,missed,noReport,notExpected */
    DepartureStatus?: string;
    /** s:string */
    DepartureProximityText?: string;
    /** s:string */
    DeparturePlatformName?: string;
    /** DepartureBoardingActivityEnumeration|s:string|boarding,noBoarding,passThru */
    DepartureBoardingActivity?: string;
    /** DepartureStopAssignment */
    DepartureStopAssignment?: ArrivalStopAssignment;
    /** DepartureOperatorRefs[] */
    DepartureOperatorRefs?: Array<OperatorRef>;
    /** s:duration */
    AimedHeadwayInterval?: string;
    /** s:duration */
    ExpectedHeadwayInterval?: string;
    /** s:nonNegativeInteger */
    DistanceFromStop?: string;
    /** s:nonNegativeInteger */
    NumberOfStopsAway?: string;
    /** Extensions */
    Extensions?: RequestExtension;
}
