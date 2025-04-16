import { AccessibilityAssessment } from "./AccessibilityAssessment";
import { RequestExtension } from "./RequestExtension";

/**
 * FacilityStatus
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface FacilityStatus {
    /** FacilityStatusEnumeration|s:string|unknown,available,notAvailable,partiallyAvailable,added,removed */
    Status?: string;
    /** s:string */
    Description?: Array<string>;
    /** AccessibilityAssessment */
    AccessibilityAssessment?: AccessibilityAssessment;
    /** Extensions */
    Extensions?: RequestExtension;
}
