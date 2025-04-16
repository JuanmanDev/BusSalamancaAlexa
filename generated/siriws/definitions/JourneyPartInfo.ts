import { TrainNumberRef } from "./TrainNumberRef";
import { OperatorRef } from "./OperatorRef";

/**
 * JourneyPartInfo
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface JourneyPartInfo {
    /** s:normalizedString */
    JourneyPartRef?: string;
    /** TrainNumberRef */
    TrainNumberRef?: TrainNumberRef;
    /** OperatorRef */
    OperatorRef?: OperatorRef;
}
