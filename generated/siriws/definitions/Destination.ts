import { DestinationRef } from "./DestinationRef";
import { DirectionRef } from "./DirectionRef";

/**
 * Destination
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface Destination {
    /** DestinationRef */
    DestinationRef?: DestinationRef;
    /** s:string */
    PlaceName?: Array<string>;
    /** DirectionRef */
    DirectionRef?: DirectionRef;
}
