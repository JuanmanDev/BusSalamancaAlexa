import { DataFrameRef } from "./DataFrameRef";

/**
 * FramedVehicleJourneyRef
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface FramedVehicleJourneyRef {
    /** DataFrameRef */
    DataFrameRef?: DataFrameRef;
    /** s:NMTOKEN */
    DatedVehicleJourneyRef?: string;
}
