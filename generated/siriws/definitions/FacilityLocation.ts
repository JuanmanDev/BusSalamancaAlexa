import { LineRef } from "./LineRef";
import { StopPointRef } from "./StopPointRef";
import { VehicleRef } from "./VehicleRef";
import { DatedVehicleJourneyRef } from "./DatedVehicleJourneyRef";
import { ConnectionLinkRef } from "./ConnectionLinkRef";
import { InterchangeRef } from "./InterchangeRef";
import { StopPlaceRef } from "./StopPlaceRef";
import { StopPlaceComponentId } from "./StopPlaceComponentId";
import { OperatorRef } from "./OperatorRef";
import { ProductCategoryRef } from "./ProductCategoryRef";
import { ServiceFeatureRef } from "./ServiceFeatureRef";
import { VehicleFeatureRef } from "./VehicleFeatureRef";

/**
 * FacilityLocation
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface FacilityLocation {
    /** LineRef */
    LineRef?: LineRef;
    /** StopPointRef */
    StopPointRef?: StopPointRef;
    /** VehicleRef */
    VehicleRef?: VehicleRef;
    /** DatedVehicleJourneyRef */
    DatedVehicleJourneyRef?: DatedVehicleJourneyRef;
    /** ConnectionLinkRef */
    ConnectionLinkRef?: ConnectionLinkRef;
    /** InterchangeRef */
    InterchangeRef?: InterchangeRef;
    /** StopPlaceRef */
    StopPlaceRef?: StopPlaceRef;
    /** StopPlaceComponentId */
    StopPlaceComponentId?: StopPlaceComponentId;
    /** OperatorRef */
    OperatorRef?: OperatorRef;
    /** ProductCategoryRef */
    ProductCategoryRef?: ProductCategoryRef;
    /** ServiceFeatureRef[] */
    ServiceFeatureRef?: Array<ServiceFeatureRef>;
    /** VehicleFeatureRef[] */
    VehicleFeatureRef?: Array<VehicleFeatureRef>;
}
