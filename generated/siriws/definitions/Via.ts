import { OriginRef } from "./OriginRef";

/**
 * Via
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface Via {
    /** PlaceRef */
    PlaceRef?: OriginRef;
    /** s:string */
    PlaceName?: Array<string>;
    /** s:string */
    PlaceShortName?: Array<string>;
    /** s:nonNegativeInteger */
    ViaPriority?: string;
}
