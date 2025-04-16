import { RequestorRef } from "./RequestorRef";
import { MessageIdentifier } from "./MessageIdentifier";
import { LineDirectionRef } from "./LineDirectionRef";
import { BoundingBox } from "./BoundingBox";
import { VehicleLocation } from "./VehicleLocation";
import { OperatorRef } from "./OperatorRef";

/**
 * Request
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface Request3 {
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
    /** LineDirectionRef */
    LineDirectionRef?: LineDirectionRef;
    /** BoundingBox */
    BoundingBox?: BoundingBox;
    /** s:normalizedString */
    PlaceRef?: string;
    /** Circle */
    Circle?: VehicleLocation;
    /** OperatorRef */
    OperatorRef?: OperatorRef;
    /** s:language */
    Language?: string;
    /** LinesDetailEnumeration|s:string|minimum,normal,stops,full */
    LinesDetailLevel?: string;
}
