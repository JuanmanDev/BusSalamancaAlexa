import { InfoMessageIdentifier } from "./InfoMessageIdentifier";
import { InfoChannelRef } from "./InfoChannelRef";
import { SituationRef } from "./SituationRef";
import { Content } from "./Content";
import { RequestExtension } from "./RequestExtension";

/**
 * GeneralMessage
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface GeneralMessage {
    /** s:dateTime */
    RecordedAtTime?: Date;
    /** s:NMTOKEN */
    ItemIdentifier?: string;
    /** InfoMessageIdentifier */
    InfoMessageIdentifier?: InfoMessageIdentifier;
    /** s:positiveInteger */
    InfoMessageVersion?: string;
    /** InfoChannelRef */
    InfoChannelRef?: InfoChannelRef;
    /** s:dateTime */
    ValidUntilTime?: Date;
    /** SituationRef */
    SituationRef?: SituationRef;
    /** Content */
    Content?: Content;
    /** Extensions */
    Extensions?: RequestExtension;
}
