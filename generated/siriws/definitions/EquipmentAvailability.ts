import { EquipmentRef } from "./EquipmentRef";
import { EquipmentTypeRef } from "./EquipmentTypeRef";
import { Period } from "./Period";
import { EquipmentFeatures } from "./EquipmentFeatures";
import { RequestExtension } from "./RequestExtension";

/**
 * EquipmentAvailability
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface EquipmentAvailability {
    /** EquipmentRef */
    EquipmentRef?: EquipmentRef;
    /** s:string */
    Description?: Array<string>;
    /** EquipmentTypeRef */
    EquipmentTypeRef?: EquipmentTypeRef;
    /** ValidityPeriod */
    ValidityPeriod?: Period;
    /** EquipmentStatusEnumeration|s:string|unknown,available,notAvailable */
    EquipmentStatus?: string;
    /** EquipmentFeatures */
    EquipmentFeatures?: EquipmentFeatures;
    /** Extensions */
    Extensions?: RequestExtension;
}
