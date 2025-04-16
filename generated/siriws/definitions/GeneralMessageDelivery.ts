import { RequestorRef } from "./RequestorRef";
import { SubscriptionRef } from "./SubscriptionRef";
import { MessageIdentifier } from "./MessageIdentifier";
import { SubscriptionFilterRef } from "./SubscriptionFilterRef";
import { ErrorCondition } from "./ErrorCondition";
import { GeneralMessage } from "./GeneralMessage";
import { GeneralMessageCancellation } from "./GeneralMessageCancellation";
import { RequestExtension } from "./RequestExtension";

/**
 * GeneralMessageDelivery
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface GeneralMessageDelivery {
    /** s:dateTime */
    ResponseTimestamp?: Date;
    /** SubscriberRef */
    SubscriberRef?: RequestorRef;
    /** SubscriptionRef */
    SubscriptionRef?: SubscriptionRef;
    /** RequestMessageRef */
    RequestMessageRef?: MessageIdentifier;
    /** SubscriptionFilterRef */
    SubscriptionFilterRef?: SubscriptionFilterRef;
    /** s:anyURI */
    DelegatorAddress?: string;
    /** DelegatorRef */
    DelegatorRef?: RequestorRef;
    /** s:boolean */
    Status?: boolean;
    /** ErrorCondition */
    ErrorCondition?: ErrorCondition;
    /** s:dateTime */
    ValidUntil?: Date;
    /** s:duration */
    ShortestPossibleCycle?: string;
    /** s:language */
    DefaultLanguage?: string;
    /** GeneralMessage[] */
    GeneralMessage?: Array<GeneralMessage>;
    /** GeneralMessageCancellation[] */
    GeneralMessageCancellation?: Array<GeneralMessageCancellation>;
    /** Extensions */
    Extensions?: RequestExtension;
}
