import { ServiceDeliveryInfo } from "./ServiceDeliveryInfo";
import { Answer6 } from "./Answer6";
import { RequestExtension } from "./RequestExtension";

/**
 * GetGeneralMessageResult
 * @targetNSAlias `s1`
 * @targetNamespace `http://wsdl.siri.org.uk/siri`
 */
export interface GetGeneralMessageResult {
    /** ServiceDeliveryInfo */
    ServiceDeliveryInfo?: ServiceDeliveryInfo;
    /** Answer */
    Answer?: Answer6;
    /** AnswerExtension */
    AnswerExtension?: RequestExtension;
}
