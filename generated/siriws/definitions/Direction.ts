import { DirectionRef } from "./DirectionRef";
import { Stops } from "./Stops";
import { RequestExtension } from "./RequestExtension";

/**
 * Direction
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface Direction {
    /** DirectionRef */
    DirectionRef?: DirectionRef;
    /** s:string */
    DirectionName?: Array<string>;
    /** Stops */
    Stops?: Stops;
    /** Extensions */
    Extensions?: RequestExtension;
}
