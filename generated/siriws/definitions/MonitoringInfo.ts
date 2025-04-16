import { ValidityCondition } from "./ValidityCondition";
import { RequestExtension } from "./RequestExtension";

/**
 * MonitoringInfo
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface MonitoringInfo {
    /** s:duration */
    MonitoringInterval?: string;
    /** MonitoringTypeEnumeration|s:string|unknown,manual,automatic */
    MonitoringType?: string;
    /** MonitoringPeriod */
    MonitoringPeriod?: ValidityCondition;
    /** Extensions */
    Extensions?: RequestExtension;
}
