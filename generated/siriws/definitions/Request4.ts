import { Request5 } from "./Request5";
import { RequestExtension } from "./RequestExtension";

/**
 * request
 * @targetNSAlias `s1`
 * @targetNamespace `http://wsdl.siri.org.uk/siri`
 */
export interface Request4 {
    /** Request */
    Request?: Request5;
    /** RequestExtension */
    RequestExtension?: RequestExtension;
}
