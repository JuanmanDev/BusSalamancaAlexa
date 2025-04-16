import { ErrorCondition } from "./ErrorCondition";
import { AnnotatedLineRef } from "./AnnotatedLineRef";
import { RequestExtension } from "./RequestExtension";

/**
 * Answer
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface Answer2 {
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
    /** AnnotatedLineRef[] */
    AnnotatedLineRef?: Array<AnnotatedLineRef>;
    /** Extensions */
    Extensions?: RequestExtension;
}
