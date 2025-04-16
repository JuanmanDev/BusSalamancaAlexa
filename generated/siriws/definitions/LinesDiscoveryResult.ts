import { ServiceDeliveryInfo } from "./ServiceDeliveryInfo";
import { Answer2 } from "./Answer2";
import { RequestExtension } from "./RequestExtension";

/**
 * LinesDiscoveryResult
 * @targetNSAlias `s1`
 * @targetNamespace `http://wsdl.siri.org.uk/siri`
 */
export interface LinesDiscoveryResult {
    /** LinesDiscoveryAnswerInfo */
    LinesDiscoveryAnswerInfo?: ServiceDeliveryInfo;
    /** Answer */
    Answer?: Answer2;
    /** AnswerExtension */
    AnswerExtension?: RequestExtension;
}
