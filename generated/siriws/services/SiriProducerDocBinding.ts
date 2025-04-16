import { SiriProducerDocBindingSoap } from "../ports/SiriProducerDocBindingSoap";
import { SiriProducerDocBindingSoap12 } from "../ports/SiriProducerDocBindingSoap12";

export interface SiriProducerDocBinding {
    readonly SiriProducerDocBindingSoap: SiriProducerDocBindingSoap;
    readonly SiriProducerDocBindingSoap12: SiriProducerDocBindingSoap12;
}
