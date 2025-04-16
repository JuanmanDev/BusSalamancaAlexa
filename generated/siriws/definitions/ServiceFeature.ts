
/**
 * ServiceFeature
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface ServiceFeature {
    /** s:NMTOKEN */
    ServiceFeatureCode?: string;
    /** s:string */
    Name?: Array<string>;
    /** s:anyURI */
    Icon?: string;
}
