import { UnknownParticipantError } from "./UnknownParticipantError";
import { AccessNotAllowedError } from "./AccessNotAllowedError";
import { EndpointDeniedAccessError } from "./EndpointDeniedAccessError";
import { BeyondDataHorizon } from "./BeyondDataHorizon";
import { InvalidDataReferencesError } from "./InvalidDataReferencesError";
import { AllowedResourceUsageExceededError } from "./AllowedResourceUsageExceededError";
import { UnknownExtensionsError } from "./UnknownExtensionsError";
import { OtherError } from "./OtherError";
import { EndpointNotAvailableAccessError } from "./EndpointNotAvailableAccessError";
import { CapabilityNotSupportedError } from "./CapabilityNotSupportedError";
import { NoInfoForTopicError } from "./NoInfoForTopicError";
import { ServiceNotAvailableError } from "./ServiceNotAvailableError";
import { UnapprovedKeyAccessError } from "./UnapprovedKeyAccessError";
import { ParametersIgnoredError } from "./ParametersIgnoredError";
import { UnknownEndpointError } from "./UnknownEndpointError";

/**
 * ErrorCondition
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface ErrorCondition {
    /** UnknownParticipantError */
    UnknownParticipantError?: UnknownParticipantError;
    /** AccessNotAllowedError */
    AccessNotAllowedError?: AccessNotAllowedError;
    /** EndpointDeniedAccessError */
    EndpointDeniedAccessError?: EndpointDeniedAccessError;
    /** BeyondDataHorizon */
    BeyondDataHorizon?: BeyondDataHorizon;
    /** InvalidDataReferencesError */
    InvalidDataReferencesError?: InvalidDataReferencesError;
    /** AllowedResourceUsageExceededError */
    AllowedResourceUsageExceededError?: AllowedResourceUsageExceededError;
    /** UnknownExtensionsError */
    UnknownExtensionsError?: UnknownExtensionsError;
    /** OtherError */
    OtherError?: OtherError;
    /** EndpointNotAvailableAccessError */
    EndpointNotAvailableAccessError?: EndpointNotAvailableAccessError;
    /** CapabilityNotSupportedError */
    CapabilityNotSupportedError?: CapabilityNotSupportedError;
    /** NoInfoForTopicError */
    NoInfoForTopicError?: NoInfoForTopicError;
    /** ServiceNotAvailableError */
    ServiceNotAvailableError?: ServiceNotAvailableError;
    /** UnapprovedKeyAccessError */
    UnapprovedKeyAccessError?: UnapprovedKeyAccessError;
    /** ParametersIgnoredError */
    ParametersIgnoredError?: ParametersIgnoredError;
    /** UnknownEndpointError */
    UnknownEndpointError?: UnknownEndpointError;
    /** s:string */
    Description?: string;
}
