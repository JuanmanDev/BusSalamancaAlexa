
/**
 * ServiceNotAvailableError
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface ServiceNotAvailableError {
    /** s:string */
    ErrorText?: string;
    /** s:dateTime */
    ExpectedRestartTime?: Date;
}
