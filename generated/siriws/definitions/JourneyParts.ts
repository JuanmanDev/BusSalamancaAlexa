import { JourneyPartInfo } from "./JourneyPartInfo";

/**
 * JourneyParts
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface JourneyParts {
    /** JourneyPartInfo[] */
    JourneyPartInfo?: Array<JourneyPartInfo>;
}
