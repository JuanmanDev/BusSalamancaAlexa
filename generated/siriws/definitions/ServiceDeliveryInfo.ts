import { RequestorRef } from "./RequestorRef";
import { MessageIdentifier } from "./MessageIdentifier";
import { RequestMessageRef } from "./RequestMessageRef";

/**
 * ServiceDeliveryInfo
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface ServiceDeliveryInfo {
    /** s:dateTime */
    ResponseTimestamp?: Date;
    /** ProducerRef */
    ProducerRef?: RequestorRef;
    /** s:anyURI */
    Address?: string;
    /** ResponseMessageIdentifier */
    ResponseMessageIdentifier?: MessageIdentifier;
    /** RequestMessageRef */
    RequestMessageRef?: RequestMessageRef;
}
