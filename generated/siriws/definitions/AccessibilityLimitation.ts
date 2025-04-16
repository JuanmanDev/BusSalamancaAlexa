import { ValidityCondition1 } from "./ValidityCondition1";
import { Extensions1 } from "./Extensions1";

/**
 * AccessibilityLimitation
 * @targetNSAlias `s4`
 * @targetNamespace `http://www.ifopt.org.uk/acsb`
 */
export interface AccessibilityLimitation {
    /** s:NMTOKEN */
    LimitationId?: string;
    /** ValidityCondition */
    ValidityCondition?: ValidityCondition1;
    /** AccessibilityEnumeration|s:string|unknown,false,true */
    WheelchairAccess?: string;
    /** AccessibilityEnumeration|s:string|unknown,false,true */
    StepFreeAccess?: string;
    /** AccessibilityEnumeration|s:string|unknown,false,true */
    EscalatorFreeAccess?: string;
    /** AccessibilityEnumeration|s:string|unknown,false,true */
    LiftFreeAccess?: string;
    /** AccessibilityEnumeration|s:string|unknown,false,true */
    AudibleSignalsAvailable?: string;
    /** AccessibilityEnumeration|s:string|unknown,false,true */
    VisualSignsAvailable?: string;
    /** Extensions */
    Extensions?: Extensions1;
}
