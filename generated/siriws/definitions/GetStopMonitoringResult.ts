import { ServiceDeliveryInfo } from "./ServiceDeliveryInfo";
import { Answer } from "./Answer";
import { RequestExtension } from "./RequestExtension";

/**
 * GetStopMonitoringResult
 * @targetNSAlias `s1`
 * @targetNamespace `http://wsdl.siri.org.uk/siri`
 */
export interface GetStopMonitoringResult {
    /** ServiceDeliveryInfo */
    ServiceDeliveryInfo?: ServiceDeliveryInfo;
    /** Answer */
    Answer?: Answer;
    /** AnswerExtension */
    AnswerExtension?: RequestExtension;
}
