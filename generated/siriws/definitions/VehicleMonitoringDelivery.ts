import { RequestorRef } from "./RequestorRef";
import { SubscriptionRef } from "./SubscriptionRef";
import { MessageIdentifier } from "./MessageIdentifier";
import { SubscriptionFilterRef } from "./SubscriptionFilterRef";
import { ErrorCondition } from "./ErrorCondition";
import { VehicleActivity } from "./VehicleActivity";
import { VehicleActivityCancellation } from "./VehicleActivityCancellation";
import { RequestExtension } from "./RequestExtension";

/**
 * VehicleMonitoringDelivery
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface VehicleMonitoringDelivery {
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
    /** VehicleActivity[] */
    VehicleActivity?: Array<VehicleActivity>;
    /** VehicleActivityCancellation[] */
    VehicleActivityCancellation?: Array<VehicleActivityCancellation>;
    /** s:string */
    VehicleActivityNote?: Array<string>;
    /** Extensions */
    Extensions?: RequestExtension;
}
