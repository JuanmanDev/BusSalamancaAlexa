import { ServiceRequestInfo } from "./ServiceRequestInfo";
import { RequestExtension } from "./RequestExtension";

/**
 * request
 * @targetNSAlias `s1`
 * @targetNamespace `http://wsdl.siri.org.uk/siri`
 */
export interface Request6 {
    /** ServiceRequestInfo */
    ServiceRequestInfo?: ServiceRequestInfo;
    /** Request */
    Request?: Request6;
    /** RequestExtension */
    RequestExtension?: RequestExtension;
}
