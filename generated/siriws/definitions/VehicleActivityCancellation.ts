import { ItemRef } from "./ItemRef";
import { VehicleMonitoringRef } from "./VehicleMonitoringRef";
import { FramedVehicleJourneyRef } from "./FramedVehicleJourneyRef";
import { LineRef } from "./LineRef";
import { DirectionRef } from "./DirectionRef";
import { JourneyPatternRef } from "./JourneyPatternRef";
import { RouteRef } from "./RouteRef";
import { GroupOfLinesRef } from "./GroupOfLinesRef";
import { RequestExtension } from "./RequestExtension";

/**
 * VehicleActivityCancellation
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface VehicleActivityCancellation {
    /** s:dateTime */
    RecordedAtTime?: Date;
    /** ItemRef */
    ItemRef?: ItemRef;
    /** VehicleMonitoringRef */
    VehicleMonitoringRef?: VehicleMonitoringRef;
    /** VehicleJourneyRef */
    VehicleJourneyRef?: FramedVehicleJourneyRef;
    /** LineRef */
    LineRef?: LineRef;
    /** DirectionRef */
    DirectionRef?: DirectionRef;
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
