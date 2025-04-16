import { SituationFullRef } from "./SituationFullRef";

/**
 * SituationRef
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface SituationRef {
    /** s:string */
    SituationSimpleRef?: string;
    /** SituationFullRef */
    SituationFullRef?: SituationFullRef;
}
