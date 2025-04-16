import { RequestorRef } from "./RequestorRef";
import { SubscriptionRef } from "./SubscriptionRef";
import { MessageIdentifier } from "./MessageIdentifier";
import { SubscriptionFilterRef } from "./SubscriptionFilterRef";
import { ErrorCondition } from "./ErrorCondition";
import { MonitoringRef } from "./MonitoringRef";
import { MonitoredStopVisit } from "./MonitoredStopVisit";
import { MonitoredStopVisitCancellation } from "./MonitoredStopVisitCancellation";
import { StopLineNotice } from "./StopLineNotice";
import { StopLineNoticeCancellation } from "./StopLineNoticeCancellation";
import { StopNotice } from "./StopNotice";
import { StopNoticeCancellation } from "./StopNoticeCancellation";
import { ServiceException } from "./ServiceException";
import { RequestExtension } from "./RequestExtension";

/**
 * StopMonitoringDelivery
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface StopMonitoringDelivery {
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
    /** MonitoringRef[] */
    MonitoringRef?: Array<MonitoringRef>;
    /** s:string */
    MonitoringName?: Array<string>;
    /** MonitoredStopVisit[] */
    MonitoredStopVisit?: Array<MonitoredStopVisit>;
    /** MonitoredStopVisitCancellation[] */
    MonitoredStopVisitCancellation?: Array<MonitoredStopVisitCancellation>;
    /** StopLineNotice[] */
    StopLineNotice?: Array<StopLineNotice>;
    /** StopLineNoticeCancellation[] */
    StopLineNoticeCancellation?: Array<StopLineNoticeCancellation>;
    /** StopNotice[] */
    StopNotice?: Array<StopNotice>;
    /** StopNoticeCancellation[] */
    StopNoticeCancellation?: Array<StopNoticeCancellation>;
    /** ServiceException[] */
    ServiceException?: Array<ServiceException>;
    /** s:string */
    Note?: Array<string>;
    /** Extensions */
    Extensions?: RequestExtension;
}
