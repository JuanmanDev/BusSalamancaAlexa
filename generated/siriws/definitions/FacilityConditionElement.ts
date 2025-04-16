import { FacilityRef } from "./FacilityRef";
import { Facility } from "./Facility";
import { FacilityStatus } from "./FacilityStatus";
import { SituationRef } from "./SituationRef";
import { Remedy } from "./Remedy";
import { MonitoringInfo } from "./MonitoringInfo";
import { Period } from "./Period";
import { RequestExtension } from "./RequestExtension";

/**
 * FacilityConditionElement
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface FacilityConditionElement {
    /** FacilityRef */
    FacilityRef?: FacilityRef;
    /** Facility */
    Facility?: Facility;
    /** FacilityStatus */
    FacilityStatus?: FacilityStatus;
    /** SituationRef */
    SituationRef?: SituationRef;
    /** Remedy */
    Remedy?: Remedy;
    /** MonitoringInfo */
    MonitoringInfo?: MonitoringInfo;
    /** ValidityPeriod */
    ValidityPeriod?: Period;
    /** Extensions */
    Extensions?: RequestExtension;
}
