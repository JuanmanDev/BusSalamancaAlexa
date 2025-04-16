import { RequestExtension } from "./RequestExtension";

/**
 * Remedy
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface Remedy {
    /** RemedyTypeEnumeration|s:string|unknown,replace,repair,remove,otherRoute,otherLocation */
    RemedyType?: string;
    /** s:string */
    Description?: Array<string>;
    /** Extensions */
    Extensions?: RequestExtension;
}
