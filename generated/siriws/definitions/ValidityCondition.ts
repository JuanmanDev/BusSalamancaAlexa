import { Period } from "./Period";
import { Timeband } from "./Timeband";

/**
 * ValidityCondition
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface ValidityCondition {
    /** Period[] */
    Period?: Array<Period>;
    /** Timeband[] */
    Timeband?: Array<Timeband>;
    /** DaysOfWeekEnumerationx|s:string|unknown,monday,tuesday,wednesday,thursday,friday,saturday,sunday,mondayToFriday,mondayToSaturday,weekdays,weekends */
    DayType?: Array<string>;
    /** HolidayTypeEnumerationx|s:string|holiday,publicHoliday,religiousHoliday,federalHoliday,regionalHoliday,nationalHoliday,sundaysAndPublicHolidays,schoolDays,everyDay,undefinedDayType */
    HolidayType?: Array<string>;
}
