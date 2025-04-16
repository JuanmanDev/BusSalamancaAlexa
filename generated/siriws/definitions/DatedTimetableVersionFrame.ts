import { VersionRef } from "./VersionRef";
import { LineRef } from "./LineRef";
import { DirectionRef } from "./DirectionRef";
import { JourneyPatternRef } from "./JourneyPatternRef";
import { RouteRef } from "./RouteRef";
import { GroupOfLinesRef } from "./GroupOfLinesRef";
import { OperatorRef } from "./OperatorRef";
import { ProductCategoryRef } from "./ProductCategoryRef";
import { ServiceFeatureRef } from "./ServiceFeatureRef";
import { VehicleFeatureRef } from "./VehicleFeatureRef";
import { DatedVehicleJourney } from "./DatedVehicleJourney";
import { ServiceJourneyInterchange } from "./ServiceJourneyInterchange";
import { RequestExtension } from "./RequestExtension";

/**
 * DatedTimetableVersionFrame
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface DatedTimetableVersionFrame {
    /** s:dateTime */
    RecordedAtTime?: Date;
    /** VersionRef */
    VersionRef?: VersionRef;
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
    /** OperatorRef */
    OperatorRef?: OperatorRef;
    /** ProductCategoryRef */
    ProductCategoryRef?: ProductCategoryRef;
    /** ServiceFeatureRef[] */
    ServiceFeatureRef?: Array<ServiceFeatureRef>;
    /** VehicleFeatureRef[] */
    VehicleFeatureRef?: Array<VehicleFeatureRef>;
    /** s:string */
    DestinationDisplay?: Array<string>;
    /** s:string */
    LineNote?: Array<string>;
    /** FirstOrLastJourneyEnumeration|s:string|firstServiceOfDay,otherService,lastServiceOfDay,unspecified */
    FirstOrLastJourney?: string;
    /** s:boolean */
    HeadwayService?: boolean;
    /** s:boolean */
    Monitored?: boolean;
    /** DatedVehicleJourney[] */
    DatedVehicleJourney?: Array<DatedVehicleJourney>;
    /** ServiceJourneyInterchange[] */
    ServiceJourneyInterchange?: Array<ServiceJourneyInterchange>;
    /** Extensions */
    Extensions?: RequestExtension;
}
