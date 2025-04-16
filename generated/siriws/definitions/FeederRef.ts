import { FramedVehicleJourneyRef } from "./FramedVehicleJourneyRef";
import { LineRef } from "./LineRef";
import { RequestorRef } from "./RequestorRef";

/**
 * FeederRef
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface FeederRef {
    /** FramedVehicleJourneyRef */
    FramedVehicleJourneyRef?: FramedVehicleJourneyRef;
    /** LineRef */
    LineRef?: LineRef;
    /** ParticipantRef */
    ParticipantRef?: RequestorRef;
}
