import { RequestorRef } from "./RequestorRef";
import { SubscriptionRef } from "./SubscriptionRef";
import { MessageIdentifier } from "./MessageIdentifier";
import { SubscriptionFilterRef } from "./SubscriptionFilterRef";
import { ErrorCondition } from "./ErrorCondition";
import { TimetabledStopVisit } from "./TimetabledStopVisit";
import { TimetabledStopVisitCancellation } from "./TimetabledStopVisitCancellation";
import { RequestExtension } from "./RequestExtension";

/**
 * StopTimetableDelivery
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface StopTimetableDelivery {
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
    /** TimetabledStopVisit[] */
    TimetabledStopVisit?: Array<TimetabledStopVisit>;
    /** TimetabledStopVisitCancellation[] */
    TimetabledStopVisitCancellation?: Array<TimetabledStopVisitCancellation>;
    /** Extensions */
    Extensions?: RequestExtension;
}
