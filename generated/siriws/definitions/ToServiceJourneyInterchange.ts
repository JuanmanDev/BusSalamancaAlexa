import { ConnectionLinkRef } from "./ConnectionLinkRef";
import { FeederRef } from "./FeederRef";
import { StopPointRef } from "./StopPointRef";
import { RequestExtension } from "./RequestExtension";

/**
 * ToServiceJourneyInterchange
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface ToServiceJourneyInterchange {
    /** s:NMTOKEN */
    InterchangeCode?: string;
    /** ConnectionLinkRef */
    ConnectionLinkRef?: ConnectionLinkRef;
    /** FeederRef */
    FeederRef?: FeederRef;
    /** FeederArrivalStopRef */
    FeederArrivalStopRef?: StopPointRef;
    /** s:positiveInteger */
    FeederVisitNumber?: string;
    /** DistributorRef */
    DistributorRef?: FeederRef;
    /** DistributorDepartureStopRef */
    DistributorDepartureStopRef?: StopPointRef;
    /** s:positiveInteger */
    DistributorVisitNumber?: string;
    /** s:boolean */
    StaySeated?: boolean;
    /** s:boolean */
    Guaranteed?: boolean;
    /** s:boolean */
    Advertised?: boolean;
    /** s:duration */
    StandardWaitTime?: string;
    /** s:duration */
    MaximumWaitTime?: string;
    /** s:duration */
    MaximumAutomaticWaitTime?: string;
    /** s:duration */
    StandardTransferTime?: string;
    /** s:duration */
    MinimumTransferTime?: string;
    /** s:duration */
    MaximumTransferTime?: string;
    /** Extensions */
    Extensions?: RequestExtension;
}
