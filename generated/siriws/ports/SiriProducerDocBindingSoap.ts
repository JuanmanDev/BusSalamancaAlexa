import { GetStopMonitoring } from "../definitions/GetStopMonitoring";
import { GetStopMonitoringResponse } from "../definitions/GetStopMonitoringResponse";
import { GetVehicleMonitoring } from "../definitions/GetVehicleMonitoring";
import { GetVehicleMonitoringResponse } from "../definitions/GetVehicleMonitoringResponse";
import { LinesDiscovery } from "../definitions/LinesDiscovery";
import { LinesDiscoveryResponse } from "../definitions/LinesDiscoveryResponse";
import { StopPointsDiscovery } from "../definitions/StopPointsDiscovery";
import { StopPointsDiscoveryResponse } from "../definitions/StopPointsDiscoveryResponse";
import { GetProductionTimetable } from "../definitions/GetProductionTimetable";
import { GetProductionTimetableResponse } from "../definitions/GetProductionTimetableResponse";
import { GetStopTimetable } from "../definitions/GetStopTimetable";
import { GetStopTimetableResponse } from "../definitions/GetStopTimetableResponse";
import { GetGeneralMessage } from "../definitions/GetGeneralMessage";
import { GetGeneralMessageResponse } from "../definitions/GetGeneralMessageResponse";

export interface SiriProducerDocBindingSoap {
    GetStopMonitoring(getStopMonitoring: GetStopMonitoring, callback: (err: any, result: GetStopMonitoringResponse, rawResponse: any, soapHeader: any, rawRequest: any) => void): void;
    GetVehicleMonitoring(getVehicleMonitoring: GetVehicleMonitoring, callback: (err: any, result: GetVehicleMonitoringResponse, rawResponse: any, soapHeader: any, rawRequest: any) => void): void;
    LinesDiscovery(linesDiscovery: LinesDiscovery, callback: (err: any, result: LinesDiscoveryResponse, rawResponse: any, soapHeader: any, rawRequest: any) => void): void;
    StopPointsDiscovery(stopPointsDiscovery: StopPointsDiscovery, callback: (err: any, result: StopPointsDiscoveryResponse, rawResponse: any, soapHeader: any, rawRequest: any) => void): void;
    GetProductionTimetable(getProductionTimetable: GetProductionTimetable, callback: (err: any, result: GetProductionTimetableResponse, rawResponse: any, soapHeader: any, rawRequest: any) => void): void;
    GetStopTimetable(getStopTimetable: GetStopTimetable, callback: (err: any, result: GetStopTimetableResponse, rawResponse: any, soapHeader: any, rawRequest: any) => void): void;
    GetGeneralMessage(getGeneralMessage: GetGeneralMessage, callback: (err: any, result: GetGeneralMessageResponse, rawResponse: any, soapHeader: any, rawRequest: any) => void): void;
}
