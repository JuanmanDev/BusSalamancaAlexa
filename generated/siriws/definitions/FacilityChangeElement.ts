import { EquipmentAvailability } from "./EquipmentAvailability";
import { SituationRef } from "./SituationRef";
import { MobilityDisruption } from "./MobilityDisruption";

/**
 * FacilityChangeElement
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface FacilityChangeElement {
    /** EquipmentAvailability */
    EquipmentAvailability?: EquipmentAvailability;
    /** SituationRef */
    SituationRef?: SituationRef;
    /** MobilityDisruption */
    MobilityDisruption?: MobilityDisruption;
}
