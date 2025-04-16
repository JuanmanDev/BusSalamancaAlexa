import { VehicleLocation } from "./VehicleLocation";

/**
 * BoundingBox
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface BoundingBox {
    /** UpperLeft */
    UpperLeft?: VehicleLocation;
    /** LowerRight */
    LowerRight?: VehicleLocation;
}
