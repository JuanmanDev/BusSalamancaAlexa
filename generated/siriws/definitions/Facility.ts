import { Features } from "./Features";
import { OwnerRef } from "./OwnerRef";
import { ValidityCondition } from "./ValidityCondition";
import { FacilityLocation } from "./FacilityLocation";
import { Limitations } from "./Limitations";
import { Suitabilities } from "./Suitabilities";
import { AccessibilityAssessment } from "./AccessibilityAssessment";
import { RequestExtension } from "./RequestExtension";

/**
 * Facility
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface Facility {
    /** s:NMTOKEN */
    FacilityCode?: string;
    /** s:string */
    Description?: Array<string>;
    /** FacilityCategoryEnumeration|s:string|unknown,fixedEquipment,serviceProvidedByIndividual,serviceForPersonalDevice,reservedArea */
    FacilityClass?: Array<string>;
    /** Features */
    Features?: Features;
    /** OwnerRef */
    OwnerRef?: OwnerRef;
    /** s:string */
    OwnerName?: string;
    /** ValidityCondition */
    ValidityCondition?: ValidityCondition;
    /** FacilityLocation */
    FacilityLocation?: FacilityLocation;
    /** Limitations */
    Limitations?: Limitations;
    /** Suitabilities */
    Suitabilities?: Suitabilities;
    /** AccessibilityAssessment */
    AccessibilityAssessment?: AccessibilityAssessment;
    /** Extensions */
    Extensions?: RequestExtension;
}
