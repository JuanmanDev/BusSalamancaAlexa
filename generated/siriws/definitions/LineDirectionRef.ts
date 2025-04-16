import { LineRef } from "./LineRef";
import { DirectionRef } from "./DirectionRef";

/**
 * LineDirectionRef
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface LineDirectionRef {
    /** LineRef */
    LineRef?: LineRef;
    /** DirectionRef */
    DirectionRef?: DirectionRef;
}
