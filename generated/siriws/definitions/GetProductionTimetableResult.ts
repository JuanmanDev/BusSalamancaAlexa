import { ServiceDeliveryInfo } from "./ServiceDeliveryInfo";
import { Answer4 } from "./Answer4";
import { RequestExtension } from "./RequestExtension";

/**
 * GetProductionTimetableResult
 * @targetNSAlias `s1`
 * @targetNamespace `http://wsdl.siri.org.uk/siri`
 */
export interface GetProductionTimetableResult {
    /** ServiceDeliveryInfo */
    ServiceDeliveryInfo?: ServiceDeliveryInfo;
    /** Answer */
    Answer?: Answer4;
    /** AnswerExtension */
    AnswerExtension?: RequestExtension;
}
