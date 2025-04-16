import { RequestorRef } from "./RequestorRef";
import { MessageIdentifier } from "./MessageIdentifier";
import { BoundingBox } from "./BoundingBox";
import { VehicleLocation } from "./VehicleLocation";
import { OperatorRef } from "./OperatorRef";
import { LineRef } from "./LineRef";

/**
 * Request
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface Request5 {
    /** s:dateTime */
    RequestTimestamp?: Date;
    /** s:NMTOKEN */
    AccountId?: string;
    /** s:normalizedString */
    AccountKey?: string;
    /** s:anyURI */
    Address?: string;
    /** RequestorRef */
    RequestorRef?: RequestorRef;
    /** MessageIdentifier */
    MessageIdentifier?: MessageIdentifier;
    /** BoundingBox */
    BoundingBox?: BoundingBox;
    /** s:normalizedString */
    PlaceRef?: string;
    /** Circle */
    Circle?: VehicleLocation;
    /** OperatorRef */
    OperatorRef?: OperatorRef;
    /** LineRef */
    LineRef?: LineRef;
    /** s:language */
    Language?: string;
    /** StopPointsDetailEnumeration|s:string|minimum,normal,full */
    StopPointsDetailLevel?: string;
}
