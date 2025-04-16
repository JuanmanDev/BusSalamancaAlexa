import { ServiceRequestContext } from "./ServiceRequestContext";
import { RequestorRef } from "./RequestorRef";
import { MessageIdentifier } from "./MessageIdentifier";

/**
 * ServiceRequestInfo
 * @targetNSAlias `s1`
 * @targetNamespace `http://wsdl.siri.org.uk/siri`
 */
export interface ServiceRequestInfo {
    /** ServiceRequestContext */
    ServiceRequestContext?: ServiceRequestContext;
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
    /** s:anyURI */
    DelegatorAddress?: string;
    /** DelegatorRef */
    DelegatorRef?: RequestorRef;
}
