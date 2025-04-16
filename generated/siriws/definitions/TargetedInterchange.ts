import { DatedVehicleJourneyRef } from "./DatedVehicleJourneyRef";
import { DistributorConnectionLink } from "./DistributorConnectionLink";
import { ConnectionLinkRef } from "./ConnectionLinkRef";

/**
 * TargetedInterchange
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface TargetedInterchange {
    /** s:NMTOKEN */
    InterchangeCode?: string;
    /** DistributorVehicleJourneyRef */
    DistributorVehicleJourneyRef?: DatedVehicleJourneyRef;
    /** DistributorConnectionLink */
    DistributorConnectionLink?: DistributorConnectionLink;
    /** DistributorConnectionLinkRef */
    DistributorConnectionLinkRef?: ConnectionLinkRef;
    /** s:positiveInteger */
    DistributorVisitNumber?: string;
    /** s:positiveInteger */
    DistributorOrder?: string;
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
}
