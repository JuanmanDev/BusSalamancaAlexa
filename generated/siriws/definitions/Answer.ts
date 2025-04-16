import { StopMonitoringDelivery } from "./StopMonitoringDelivery";

/**
 * Answer
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface Answer {
    /** StopMonitoringDelivery[] */
    StopMonitoringDelivery?: Array<StopMonitoringDelivery>;
}
