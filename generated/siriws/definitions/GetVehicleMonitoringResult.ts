import { ServiceDeliveryInfo } from "./ServiceDeliveryInfo";
import { Answer1 } from "./Answer1";
import { RequestExtension } from "./RequestExtension";

/**
 * GetVehicleMonitoringResult
 * @targetNSAlias `s1`
 * @targetNamespace `http://wsdl.siri.org.uk/siri`
 */
export interface GetVehicleMonitoringResult {
    /** ServiceDeliveryInfo */
    ServiceDeliveryInfo?: ServiceDeliveryInfo;
    /** Answer */
    Answer?: Answer1;
    /** AnswerExtension */
    AnswerExtension?: RequestExtension;
}
