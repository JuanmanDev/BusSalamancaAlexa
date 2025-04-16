import { StopPointRef } from "./StopPointRef";
import { OperatorRef } from "./OperatorRef";
import { ProductCategoryRef } from "./ProductCategoryRef";
import { ServiceFeatureRef } from "./ServiceFeatureRef";
import { VehicleFeatureRef } from "./VehicleFeatureRef";
import { ArrivalStopAssignment1 } from "./ArrivalStopAssignment1";

/**
 * TargetedCall
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface TargetedCall {
    /** StopPointRef */
    StopPointRef?: StopPointRef;
    /** s:positiveInteger */
    VisitNumber?: string;
    /** s:positiveInteger */
    Order?: string;
    /** s:boolean */
    TimingPoint?: boolean;
    /** OperatorRef */
    OperatorRef?: OperatorRef;
    /** ProductCategoryRef */
    ProductCategoryRef?: ProductCategoryRef;
    /** ServiceFeatureRef[] */
    ServiceFeatureRef?: Array<ServiceFeatureRef>;
    /** VehicleFeatureRef[] */
    VehicleFeatureRef?: Array<VehicleFeatureRef>;
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
}
