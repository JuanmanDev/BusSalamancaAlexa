import { ServiceRequestInfo } from "./ServiceRequestInfo";
import { RequestExtension } from "./RequestExtension";

/**
 * request
 * @targetNSAlias `s1`
 * @targetNamespace `http://wsdl.siri.org.uk/siri`
 */
export interface Request1 {
    /** ServiceRequestInfo */
    ServiceRequestInfo?: ServiceRequestInfo;
    /** Request */
    Request?: Request1;
    /** RequestExtension */
    RequestExtension?: RequestExtension;
}
