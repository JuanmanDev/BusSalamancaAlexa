import { Client as SoapClient, createClientAsync as soapCreateClientAsync, IExOptions as ISoapExOptions } from "soap";
import { GetStopMonitoring } from "./definitions/GetStopMonitoring";
import { GetStopMonitoringResponse } from "./definitions/GetStopMonitoringResponse";
import { GetVehicleMonitoring } from "./definitions/GetVehicleMonitoring";
import { GetVehicleMonitoringResponse } from "./definitions/GetVehicleMonitoringResponse";
import { LinesDiscovery } from "./definitions/LinesDiscovery";
import { LinesDiscoveryResponse } from "./definitions/LinesDiscoveryResponse";
import { StopPointsDiscovery } from "./definitions/StopPointsDiscovery";
import { StopPointsDiscoveryResponse } from "./definitions/StopPointsDiscoveryResponse";
import { GetProductionTimetable } from "./definitions/GetProductionTimetable";
import { GetProductionTimetableResponse } from "./definitions/GetProductionTimetableResponse";
import { GetStopTimetable } from "./definitions/GetStopTimetable";
import { GetStopTimetableResponse } from "./definitions/GetStopTimetableResponse";
import { GetGeneralMessage } from "./definitions/GetGeneralMessage";
import { GetGeneralMessageResponse } from "./definitions/GetGeneralMessageResponse";
import { SiriProducerDocBinding } from "./services/SiriProducerDocBinding";

export interface SiriWsClient extends SoapClient {
    SiriProducerDocBinding: SiriProducerDocBinding;
    GetStopMonitoringAsync(getStopMonitoring: GetStopMonitoring, options?: ISoapExOptions): Promise<[result: GetStopMonitoringResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
    GetVehicleMonitoringAsync(getVehicleMonitoring: GetVehicleMonitoring, options?: ISoapExOptions): Promise<[result: GetVehicleMonitoringResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
    LinesDiscoveryAsync(linesDiscovery: LinesDiscovery, options?: ISoapExOptions): Promise<[result: LinesDiscoveryResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
    StopPointsDiscoveryAsync(stopPointsDiscovery: StopPointsDiscovery, options?: ISoapExOptions): Promise<[result: StopPointsDiscoveryResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
    GetProductionTimetableAsync(getProductionTimetable: GetProductionTimetable, options?: ISoapExOptions): Promise<[result: GetProductionTimetableResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
    GetStopTimetableAsync(getStopTimetable: GetStopTimetable, options?: ISoapExOptions): Promise<[result: GetStopTimetableResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
    GetGeneralMessageAsync(getGeneralMessage: GetGeneralMessage, options?: ISoapExOptions): Promise<[result: GetGeneralMessageResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
    GetStopMonitoringAsync(getStopMonitoring: GetStopMonitoring, options?: ISoapExOptions): Promise<[result: GetStopMonitoringResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
    GetVehicleMonitoringAsync(getVehicleMonitoring: GetVehicleMonitoring, options?: ISoapExOptions): Promise<[result: GetVehicleMonitoringResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
    LinesDiscoveryAsync(linesDiscovery: LinesDiscovery, options?: ISoapExOptions): Promise<[result: LinesDiscoveryResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
    StopPointsDiscoveryAsync(stopPointsDiscovery: StopPointsDiscovery, options?: ISoapExOptions): Promise<[result: StopPointsDiscoveryResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
    GetProductionTimetableAsync(getProductionTimetable: GetProductionTimetable, options?: ISoapExOptions): Promise<[result: GetProductionTimetableResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
    GetStopTimetableAsync(getStopTimetable: GetStopTimetable, options?: ISoapExOptions): Promise<[result: GetStopTimetableResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
    GetGeneralMessageAsync(getGeneralMessage: GetGeneralMessage, options?: ISoapExOptions): Promise<[result: GetGeneralMessageResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
}

/** Create SiriWsClient */
export function createClientAsync(...args: Parameters<typeof soapCreateClientAsync>): Promise<SiriWsClient> {
    return soapCreateClientAsync(args[0], args[1], args[2]) as any;
}
