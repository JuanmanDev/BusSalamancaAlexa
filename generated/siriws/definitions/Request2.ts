import { Request3 } from "./Request3";
import { RequestExtension } from "./RequestExtension";

/**
 * request
 * @targetNSAlias `s1`
 * @targetNamespace `http://wsdl.siri.org.uk/siri`
 */
export interface Request2 {
    /** Request */
    Request?: Request3;
    /** RequestExtension */
    RequestExtension?: RequestExtension;
}
