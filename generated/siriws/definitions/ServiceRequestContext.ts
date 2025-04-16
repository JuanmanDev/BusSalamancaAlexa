import { DataNameSpaces } from "./DataNameSpaces";

/**
 * ServiceRequestContext
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface ServiceRequestContext {
    /** s:anyURI */
    CheckStatusAddress?: string;
    /** s:anyURI */
    SubscribeAddress?: string;
    /** s:anyURI */
    ManageSubscriptionAddress?: string;
    /** s:anyURI */
    GetDataAddress?: string;
    /** s:anyURI */
    StatusResponseAddress?: string;
    /** s:anyURI */
    SubscriberAddress?: string;
    /** s:anyURI */
    NotifyAddress?: string;
    /** s:anyURI */
    ConsumerAddress?: string;
    /** DataNameSpaces */
    DataNameSpaces?: DataNameSpaces;
    /** s:language */
    Language?: string;
    /** EmptyType|s:string */
    WgsDecimalDegrees?: string;
    /** s:string */
    GmlCoordinateFormat?: string;
    /** s:normalizedString */
    DistanceUnits?: string;
    /** s:normalizedString */
    VelocityUnits?: string;
    /** s:duration */
    DataHorizon?: string;
    /** s:duration */
    RequestTimeout?: string;
    /** DeliveryMethodEnumeration|s:string|direct,fetched */
    DeliveryMethod?: string;
    /** s:boolean */
    MultipartDespatch?: boolean;
    /** s:boolean */
    ConfirmDelivery?: boolean;
    /** s:positiveInteger */
    MaximimumNumberOfSubscriptions?: string;
    /** PredictorsEnumeration|s:string|avmsOnly,anyone */
    AllowedPredictors?: string;
    /** s:string */
    PredictionFunction?: string;
}
