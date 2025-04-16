import { LineRef } from "./LineRef";
import { DirectionRef } from "./DirectionRef";
import { FramedVehicleJourneyRef } from "./FramedVehicleJourneyRef";
import { JourneyPatternRef } from "./JourneyPatternRef";
import { RouteRef } from "./RouteRef";
import { GroupOfLinesRef } from "./GroupOfLinesRef";
import { OperatorRef } from "./OperatorRef";
import { ProductCategoryRef } from "./ProductCategoryRef";
import { ServiceFeatureRef } from "./ServiceFeatureRef";
import { VehicleFeatureRef } from "./VehicleFeatureRef";
import { OriginRef } from "./OriginRef";
import { Via } from "./Via";
import { DestinationRef } from "./DestinationRef";
import { PublicContact } from "./PublicContact";
import { TargetedCall } from "./TargetedCall";

/**
 * TargetedVehicleJourney
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface TargetedVehicleJourney {
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
    /** OperatorRef */
    OperatorRef?: OperatorRef;
    /** ProductCategoryRef */
    ProductCategoryRef?: ProductCategoryRef;
    /** ServiceFeatureRef[] */
    ServiceFeatureRef?: Array<ServiceFeatureRef>;
    /** VehicleFeatureRef[] */
    VehicleFeatureRef?: Array<VehicleFeatureRef>;
    /** OriginRef */
    OriginRef?: OriginRef;
    /** s:string */
    OriginName?: Array<string>;
    /** s:string */
    OriginShortName?: Array<string>;
    /** s:string */
    DestinationDisplayAtOrigin?: Array<string>;
    /** Via[] */
    Via?: Array<Via>;
    /** DestinationRef */
    DestinationRef?: DestinationRef;
    /** s:string */
    DestinationName?: Array<string>;
    /** s:string */
    DestinationShortName?: Array<string>;
    /** s:string */
    VehicleJourneyName?: Array<string>;
    /** s:string */
    JourneyNote?: Array<string>;
    /** PublicContact */
    PublicContact?: PublicContact;
    /** OperationsContact */
    OperationsContact?: PublicContact;
    /** s:boolean */
    HeadwayService?: boolean;
    /** s:dateTime */
    OriginAimedDepartureTime?: Date;
    /** s:dateTime */
    DestinationAimedArrivalTime?: Date;
    /** FirstOrLastJourneyEnumeration|s:string|firstServiceOfDay,otherService,lastServiceOfDay,unspecified */
    FirstOrLastJourney?: string;
    /** TargetedCall */
    TargetedCall?: TargetedCall;
}
