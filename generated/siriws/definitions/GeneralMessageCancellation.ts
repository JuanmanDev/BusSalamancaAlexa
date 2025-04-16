import { ItemRef } from "./ItemRef";
import { InfoMessageIdentifier } from "./InfoMessageIdentifier";
import { InfoChannelRef } from "./InfoChannelRef";
import { RequestExtension } from "./RequestExtension";

/**
 * GeneralMessageCancellation
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface GeneralMessageCancellation {
    /** s:dateTime */
    RecordedAtTime?: Date;
    /** ItemRef */
    ItemRef?: ItemRef;
    /** InfoMessageIdentifier */
    InfoMessageIdentifier?: InfoMessageIdentifier;
    /** InfoChannelRef */
    InfoChannelRef?: InfoChannelRef;
    /** Extensions */
    Extensions?: RequestExtension;
}
