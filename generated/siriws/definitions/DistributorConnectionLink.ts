import { StopPointRef } from "./StopPointRef";

/**
 * DistributorConnectionLink
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface DistributorConnectionLink {
    /** s:NMTOKEN */
    ConnectionLinkCode?: string;
    /** StopPointRef */
    StopPointRef?: StopPointRef;
    /** s:string */
    StopPointName?: string;
    /** s:duration */
    DefaultDuration?: string;
    /** s:duration */
    FrequentTravellerDuration?: string;
    /** s:duration */
    OccasionalTravellerDuration?: string;
    /** s:duration */
    ImpairedAccessDuration?: string;
}
