import { Coordinates } from "./Coordinates";

/**
 * VehicleLocation
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface VehicleLocation {
    /** s:decimal */
    Latitude?: number;
    /** s:decimal */
    Longitude?: number;
    /** Coordinates */
    Coordinates?: Coordinates;
    /** s:nonNegativeInteger */
    Precision?: string;
}
