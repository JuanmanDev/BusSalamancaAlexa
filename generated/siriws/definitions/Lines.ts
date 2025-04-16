import { LineRef } from "./LineRef";
import { LineDirectionRef } from "./LineDirectionRef";

/**
 * Lines
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface Lines {
    /** LineRef */
    LineRef?: LineRef;
    /** LineDirection */
    LineDirection?: LineDirectionRef;
}
