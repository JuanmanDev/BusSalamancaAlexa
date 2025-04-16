import { StopPointRef } from "./StopPointRef";
import { VehicleLocation } from "./VehicleLocation";
import { FacilityConditionElement } from "./FacilityConditionElement";
import { FacilityChangeElement } from "./FacilityChangeElement";
import { SituationRef } from "./SituationRef";
import { ArrivalStopAssignment } from "./ArrivalStopAssignment";
import { OperatorRef } from "./OperatorRef";
import { ExpectedDeparturePredictionQuality } from "./ExpectedDeparturePredictionQuality";
import { RequestExtension } from "./RequestExtension";

/**
 * MonitoredCall
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface MonitoredCall {
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
    /** VehicleLocationAtStop */
    VehicleLocationAtStop?: VehicleLocation;
    /** s:boolean */
    ReversesAtStop?: boolean;
    /** s:boolean */
    PlatformTraversal?: boolean;
    /** s:NMTOKEN */
    SignalStatus?: string;
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
    /** FacilityConditionElement[] */
    FacilityConditionElement?: Array<FacilityConditionElement>;
    /** FacilityChangeElement */
    FacilityChangeElement?: FacilityChangeElement;
    /** SituationRef[] */
    SituationRef?: Array<SituationRef>;
    /** s:dateTime */
    AimedArrivalTime?: Date;
    /** s:dateTime */
    ActualArrivalTime?: Date;
    /** s:dateTime */
    ExpectedArrivalTime?: Date;
    /** s:dateTime */
    LatestExpectedArrivalTime?: Date;
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
    ActualDepartureTime?: Date;
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
