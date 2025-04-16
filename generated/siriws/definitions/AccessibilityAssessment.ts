import { Limitations1 } from "./Limitations1";
import { Suitabilities } from "./Suitabilities";
import { Extensions1 } from "./Extensions1";

/**
 * AccessibilityAssessment
 * @targetNSAlias `s4`
 * @targetNamespace `http://www.ifopt.org.uk/acsb`
 */
export interface AccessibilityAssessment {
    /** s:boolean */
    MobilityImpairedAccess?: boolean;
    /** Limitations */
    Limitations?: Limitations1;
    /** Suitabilities */
    Suitabilities?: Suitabilities;
    /** Extensions */
    Extensions?: Extensions1;
}
