import { LineRef } from "./LineRef";
import { Destinations } from "./Destinations";
import { Directions } from "./Directions";
import { RequestExtension } from "./RequestExtension";

/**
 * AnnotatedLineRef
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface AnnotatedLineRef {
    /** LineRef */
    LineRef?: LineRef;
    /** s:string */
    LineName?: Array<string>;
    /** s:boolean */
    Monitored?: boolean;
    /** Destinations */
    Destinations?: Destinations;
    /** Directions */
    Directions?: Directions;
    /** Extensions */
    Extensions?: RequestExtension;
}
