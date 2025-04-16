import { AimedQuayRef } from "./AimedQuayRef";

/**
 * ArrivalStopAssignment
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface ArrivalStopAssignment1 {
    /** AimedQuayRef */
    AimedQuayRef?: AimedQuayRef;
    /** s:string */
    AimedQuayName?: Array<string>;
}
