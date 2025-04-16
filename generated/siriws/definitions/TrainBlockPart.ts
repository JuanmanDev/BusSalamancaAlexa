import { TrainPartRef } from "./TrainPartRef";

/**
 * TrainBlockPart
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface TrainBlockPart {
    /** s:positiveInteger */
    NumberOfBlockParts?: string;
    /** TrainPartRef */
    TrainPartRef?: TrainPartRef;
    /** s:string */
    PositionOfTrainBlockPart?: Array<string>;
}
