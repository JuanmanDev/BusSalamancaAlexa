import { Extensions } from "./Extensions";

/**
 * UserNeed
 * @targetNSAlias `s4`
 * @targetNamespace `http://www.ifopt.org.uk/acsb`
 */
export interface UserNeed {
    /** MobilityEnumeration|s:string|wheelchair,assistedWheelchair,motorizedWheelchair,walkingFrame,restrictedMobility,otherMobilityNeed */
    MobilityNeed?: string;
    /** PyschosensoryNeedEnumeration|s:string|visualImpairment,auditoryImpairment,cognitiveInputImpairment,averseToLifts,averseToEscalators,averseToConfinedSpaces,averseToCrowds,otherPsychosensoryNeed */
    PsychosensoryNeed?: string;
    /** UserNeedStructureMedicalNeed|s:string|allergic,heartCondition,otherMedicalNeed */
    MedicalNeed?: string;
    /** EncumbranceEnumeration|s:string|luggageEncumbered,pushchair,baggageTrolley,oversizeBaggage,guideDog,otherAnimal,otherEncumbrance */
    EncumbranceNeed?: string;
    /** s:boolean */
    Excluded?: boolean;
    /** s:integer */
    NeedRanking?: number;
    /** Extensions */
    Extensions?: Extensions;
}
