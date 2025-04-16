import { VehicleLocation } from "./VehicleLocation";

/**
 * OnwardLinkShape
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface OnwardLinkShape {
    /** Point[] */
    Point?: Array<VehicleLocation>;
}
