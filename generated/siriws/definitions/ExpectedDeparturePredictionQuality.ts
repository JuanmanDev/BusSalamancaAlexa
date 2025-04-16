
/**
 * ExpectedDeparturePredictionQuality
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface ExpectedDeparturePredictionQuality {
    /** QualityIndexEnumeration|s:string|certain,veryReliable,reliable,probablyReliable,unconfirmed */
    PredictionLevel?: string;
    /** s:decimal */
    Percentile?: number;
    /** s:dateTime */
    LowerTimeLimit?: Date;
    /** s:dateTime */
    HigherTimeLimit?: Date;
}
