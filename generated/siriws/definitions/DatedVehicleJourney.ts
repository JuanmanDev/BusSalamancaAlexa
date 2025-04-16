import { FramedVehicleJourneyRef } from "./FramedVehicleJourneyRef";
import { VehicleJourneyRef } from "./VehicleJourneyRef";
import { JourneyPatternRef } from "./JourneyPatternRef";
import { RouteRef } from "./RouteRef";
import { GroupOfLinesRef } from "./GroupOfLinesRef";
import { LineRef } from "./LineRef";
import { OperatorRef } from "./OperatorRef";
import { ProductCategoryRef } from "./ProductCategoryRef";
import { ServiceFeatureRef } from "./ServiceFeatureRef";
import { VehicleFeatureRef } from "./VehicleFeatureRef";
import { PublicContact } from "./PublicContact";
import { BlockRef } from "./BlockRef";
import { CourseOfJourneyRef } from "./CourseOfJourneyRef";
import { DatedCalls } from "./DatedCalls";
import { RequestExtension } from "./RequestExtension";

/**
 * DatedVehicleJourney
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface DatedVehicleJourney {
    /** s:NMTOKEN */
    DatedVehicleJourneyCode?: string;
    /** FramedVehicleJourneyRef */
    FramedVehicleJourneyRef?: FramedVehicleJourneyRef;
    /** VehicleJourneyRef */
    VehicleJourneyRef?: VehicleJourneyRef;
    /** s:boolean */
    Cancellation?: boolean;
    /** s:boolean */
    ExtraJourney?: boolean;
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
    VehicleJourneyName?: Array<string>;
    /** s:string */
    JourneyNote?: Array<string>;
    /** PublicContact */
    PublicContact?: PublicContact;
    /** OperationsContact */
    OperationsContact?: PublicContact;
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
    /** BlockRef */
    BlockRef?: BlockRef;
    /** CourseOfJourneyRef */
    CourseOfJourneyRef?: CourseOfJourneyRef;
    /** DatedCalls */
    DatedCalls?: DatedCalls;
    /** Extensions */
    Extensions?: RequestExtension;
}
