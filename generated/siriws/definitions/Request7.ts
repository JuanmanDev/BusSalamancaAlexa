import { ServiceRequestInfo } from "./ServiceRequestInfo";
import { RequestExtension } from "./RequestExtension";

/**
 * request
 * @targetNSAlias `s1`
 * @targetNamespace `http://wsdl.siri.org.uk/siri`
 */
export interface Request7 {
    /** ServiceRequestInfo */
    ServiceRequestInfo?: ServiceRequestInfo;
    /** Request */
    Request?: Request7;
    /** RequestExtension */
    RequestExtension?: RequestExtension;
}
