import { ErrorCondition } from "./ErrorCondition";
import { AnnotatedStopPointRef } from "./AnnotatedStopPointRef";
import { RequestExtension } from "./RequestExtension";

/**
 * Answer
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface Answer3 {
    /** s:dateTime */
    ResponseTimestamp?: Date;
    /** s:boolean */
    Status?: boolean;
    /** ErrorCondition */
    ErrorCondition?: ErrorCondition;
    /** s:dateTime */
    ValidUntil?: Date;
    /** s:duration */
    ShortestPossibleCycle?: string;
    /** AnnotatedStopPointRef[] */
    AnnotatedStopPointRef?: Array<AnnotatedStopPointRef>;
    /** Extensions */
    Extensions?: RequestExtension;
}
