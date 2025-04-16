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
import { FacilityConditionElement } from "./FacilityConditionElement";
import { FacilityChangeElement } from "./FacilityChangeElement";
import { SituationRef } from "./SituationRef";
import { VehicleLocation } from "./VehicleLocation";
import { TrainBlockPart } from "./TrainBlockPart";
import { BlockRef } from "./BlockRef";
import { CourseOfJourneyRef } from "./CourseOfJourneyRef";
import { VehicleJourneyRef } from "./VehicleJourneyRef";
import { VehicleRef } from "./VehicleRef";
import { TrainNumbers } from "./TrainNumbers";
import { JourneyParts } from "./JourneyParts";
import { PreviousCalls } from "./PreviousCalls";
import { MonitoredCall } from "./MonitoredCall";
import { OnwardCalls } from "./OnwardCalls";

/** MonitoredVehicleJourney */
export interface MonitoredVehicleJourney1 {
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
    /** FacilityConditionElement[] */
    FacilityConditionElement?: Array<FacilityConditionElement>;
    /** FacilityChangeElement */
    FacilityChangeElement?: FacilityChangeElement;
    /** SituationRef[] */
    SituationRef?: Array<SituationRef>;
    /** s:boolean */
    Monitored?: boolean;
    /** s:NMTOKENS */
    MonitoringError?: string;
    /** s:boolean */
    InCongestion?: boolean;
    /** s:boolean */
    InPanic?: boolean;
    /** s:boolean */
    PredictionInaccurate?: boolean;
    /** s:string */
    DataSource?: string;
    /** QualityIndexEnumeration|s:string|certain,veryReliable,reliable,probablyReliable,unconfirmed */
    ConfidenceLevel?: string;
    /** VehicleLocation */
    VehicleLocation?: VehicleLocation;
    /** s:float */
    Bearing?: number;
    /** ProgressRateEnumeration|s:string|noProgress,slowProgress,normalProgress,fastProgress,unknown */
    ProgressRate?: string;
    /** s:nonNegativeInteger */
    Velocity?: string;
    /** s:boolean */
    EngineOn?: boolean;
    /** OccupancyEnumeration|s:string|full,seatsAvailable,standingAvailable */
    Occupancy?: string;
    /** s:duration */
    Delay?: string;
    /** s:string */
    ProgressStatus?: Array<string>;
    /** VehicleStatusEnumeration|s:string|expected,notExpected,cancelled,assigned,signedOn,atOrigin,inProgress,aborted,offRoute,completed,assumedCompleted,notRun */
    VehicleStatus?: string;
    /** TrainBlockPart[] */
    TrainBlockPart?: Array<TrainBlockPart>;
    /** BlockRef */
    BlockRef?: BlockRef;
    /** CourseOfJourneyRef */
    CourseOfJourneyRef?: CourseOfJourneyRef;
    /** VehicleJourneyRef */
    VehicleJourneyRef?: VehicleJourneyRef;
    /** VehicleRef */
    VehicleRef?: VehicleRef;
    /** AdditionalVehicleJourneyRef[] */
    AdditionalVehicleJourneyRef?: Array<FramedVehicleJourneyRef>;
    /** s:normalizedString */
    DriverRef?: string;
    /** s:normalizedString */
    DriverName?: string;
    /** TrainNumbers */
    TrainNumbers?: TrainNumbers;
    /** JourneyParts */
    JourneyParts?: JourneyParts;
    /** PreviousCalls */
    PreviousCalls?: PreviousCalls;
    /** MonitoredCall */
    MonitoredCall?: MonitoredCall;
    /** OnwardCalls */
    OnwardCalls?: OnwardCalls;
    /** s:boolean */
    IsCompleteStopSequence?: boolean;
}
