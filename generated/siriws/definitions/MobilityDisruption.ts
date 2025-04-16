
/**
 * MobilityDisruption
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface MobilityDisruption {
    /** s:boolean */
    MobilityImpairedAccess?: boolean;
    /** AccessFacilityEnumeration|s:string|unknown,lift,escalator,travelator,ramp,stairs,shuttle,narrowEntrance,barrier,palletAccess_lowFloor,validator */
    AccessFacility?: Array<string>;
}
