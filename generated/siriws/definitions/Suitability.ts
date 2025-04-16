import { UserNeed } from "./UserNeed";

/**
 * Suitability
 * @targetNSAlias `s4`
 * @targetNamespace `http://www.ifopt.org.uk/acsb`
 */
export interface Suitability {
    /** SuitabilityEnumeration|s:string|suitable,notSuitable */
    Suitable?: string;
    /** UserNeed */
    UserNeed?: UserNeed;
}
