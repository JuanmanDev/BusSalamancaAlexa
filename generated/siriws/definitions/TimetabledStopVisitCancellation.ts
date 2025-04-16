import { ItemRef } from "./ItemRef";
import { MonitoringRef } from "./MonitoringRef";
import { LineRef } from "./LineRef";
import { DirectionRef } from "./DirectionRef";
import { FramedVehicleJourneyRef } from "./FramedVehicleJourneyRef";
import { JourneyPatternRef } from "./JourneyPatternRef";
import { RouteRef } from "./RouteRef";
import { GroupOfLinesRef } from "./GroupOfLinesRef";
import { RequestExtension } from "./RequestExtension";

/**
 * TimetabledStopVisitCancellation
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface TimetabledStopVisitCancellation {
    /** s:dateTime */
    RecordedAtTime?: Date;
    /** ItemRef */
    ItemRef?: ItemRef;
    /** MonitoringRef */
    MonitoringRef?: MonitoringRef;
    /** s:positiveInteger */
    VisitNumber?: string;
    /** LineRef */
    LineRef?: LineRef;
    /** DirectionRef */
    DirectionRef?: DirectionRef;
    /** FramedVehicleJourneyRef */
    FramedVehicleJourneyRef?: FramedVehicleJourneyRef;
    /** JourneyPatternRef */
    JourneyPatternRef?: JourneyPatternRef;
    /** s:string */
    JourneyPatternName?: string;
    /** VehicleModesEnumeration|s:string|air,bus,coach,ferry,metro,rail,tram,underground */
    VehicleMode?: Array<string>;
    /** RouteRef */
    RouteRef?: RouteRef;
    /** s:string */
    PublishedLineName?: Array<string>;
    /** GroupOfLinesRef */
    GroupOfLinesRef?: GroupOfLinesRef;
    /** s:string */
    DirectionName?: Array<string>;
    /** ExternalLineRef */
    ExternalLineRef?: LineRef;
    /** s:string */
    Reason?: Array<string>;
    /** Extensions */
    Extensions?: RequestExtension;
}
