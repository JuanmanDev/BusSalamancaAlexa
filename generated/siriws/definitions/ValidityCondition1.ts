import { Timebands } from "./Timebands";

/**
 * ValidityCondition
 * @targetNSAlias `s3`
 * @targetNamespace `http://www.ifopt.org.uk/ifopt`
 */
export interface ValidityCondition1 {
    /** s:dateTime */
    FromDateTime?: Date;
    /** s:dateTime */
    ToDateTime?: Date;
    /** s:NMTOKEN */
    DayType?: string;
    /** Timebands[] */
    Timebands?: Array<Timebands>;
}
