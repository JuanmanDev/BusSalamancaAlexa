import { RequestorRef } from "./RequestorRef";

/**
 * UnknownParticipantError
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface UnknownParticipantError {
    /** s:string */
    ErrorText?: string;
    /** ParticipantRef */
    ParticipantRef?: RequestorRef;
}
