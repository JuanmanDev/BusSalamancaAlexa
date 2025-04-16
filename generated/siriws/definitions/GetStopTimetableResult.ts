import { ServiceDeliveryInfo } from "./ServiceDeliveryInfo";
import { Answer5 } from "./Answer5";
import { RequestExtension } from "./RequestExtension";

/**
 * GetStopTimetableResult
 * @targetNSAlias `s1`
 * @targetNamespace `http://wsdl.siri.org.uk/siri`
 */
export interface GetStopTimetableResult {
    /** ServiceDeliveryInfo */
    ServiceDeliveryInfo?: ServiceDeliveryInfo;
    /** Answer */
    Answer?: Answer5;
    /** AnswerExtension */
    AnswerExtension?: RequestExtension;
}
