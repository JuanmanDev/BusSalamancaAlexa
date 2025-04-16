import { ServiceDeliveryInfo } from "./ServiceDeliveryInfo";
import { Answer3 } from "./Answer3";
import { RequestExtension } from "./RequestExtension";

/**
 * StopPointsDiscoveryResult
 * @targetNSAlias `s1`
 * @targetNamespace `http://wsdl.siri.org.uk/siri`
 */
export interface StopPointsDiscoveryResult {
    /** StopPointsDiscoveryAnswerInfo */
    StopPointsDiscoveryAnswerInfo?: ServiceDeliveryInfo;
    /** Answer */
    Answer?: Answer3;
    /** AnswerExtension */
    AnswerExtension?: RequestExtension;
}
