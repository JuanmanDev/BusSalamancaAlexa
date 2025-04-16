import { StopPointRef } from "./StopPointRef";
import { RequestExtension } from "./RequestExtension";

/**
 * PreviousCall
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface PreviousCall {
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
    /** s:dateTime */
    AimedArrivalTime?: Date;
    /** s:dateTime */
    ExpectedArrivalTime?: Date;
    /** s:dateTime */
    ActualArrivalTime?: Date;
    /** s:dateTime */
    AimedDepartureTime?: Date;
    /** s:dateTime */
    ExpectedDepartureTime?: Date;
    /** s:dateTime */
    ActualDepartureTime?: Date;
    /** Extensions */
    Extensions?: RequestExtension;
}
