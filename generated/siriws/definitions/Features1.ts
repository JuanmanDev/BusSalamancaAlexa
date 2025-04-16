import { ServiceFeatureRef } from "./ServiceFeatureRef";
import { ServiceFeature } from "./ServiceFeature";

/**
 * Features
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface Features1 {
    /** ServiceFeatureRef */
    ServiceFeatureRef?: ServiceFeatureRef;
    /** ServiceFeature */
    ServiceFeature?: ServiceFeature;
}
