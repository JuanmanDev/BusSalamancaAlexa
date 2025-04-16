
/**
 * Feature
 * @targetNSAlias `s2`
 * @targetNamespace `http://www.siri.org.uk/siri`
 */
export interface Feature {
    /** AssistanceFacilityEnumeration|s:string|unknown,police,firstAid,sosPoint,specificAssistance,unaccompaniedMinorAssistance,boardingAssistance */
    AssistanceFacility?: string;
    /** ParkingFacilityEnumeration|s:string|unknown,carPark,parkAndRidePark,motorcyclePark,cyclePark,rentalCarPark,coachPark */
    ParkingFacility?: string;
    /** LuggageFacilityEnumeration|s:string|unknown,pti23_17,bikeCarriage,baggageStorage,leftLuggage,porterage,baggageTrolleys */
    LuggageFacility?: string;
    /** HireFacilityEnumeration|s:string|unknown,carHire,motorCycleHire,cycleHire,taxi,recreationDeviceHire */
    HireFacility?: string;
    /** FareClassFacilityEnumeration|s:string|unknown,pti23_0,unknown,pti23_6,firstClass,pti23_7,secondClass,pti23_8,thirdClass,pti23_9,economyClass,pti23_10,businessClass */
    FareClassFacility?: string;
    /** PassengerInformationFacilityEnumeration|s:string|unknown,nextStopIndicator,stopAnnouncements,passengerInformationDisplay,audioInformation,visualInformation,tactilePlatformEdges,tactileInformation,walkingGuidance,journeyPlanning,lostFound,informationDesk,interactiveKiosk-Display,printedPublicNotice */
    PassengerInformationFacility?: string;
    /** AccommodationFacilityEnumeration|s:string|unknown,pti23_3,sleeper,pti23_4,couchette,pti23_5,specialSeating,pti23_11,freeSeating,pti23_12,recliningSeats,pti23_13,babyCompartment,familyCarriage */
    AccommodationFacility?: string;
    /** SanitaryFacilityEnumeration|s:string|unknown,pti23_22,toilet,pti23_23,noToilet,shower,wheelchairAcccessToilet,babyChange */
    SanitaryFacility?: string;
    /** NuisanceFacilityEnumeration|s:string|unknown,smoking,noSmoking,mobilePhoneUseZone,mobilePhoneFreeZone */
    NuisanceFacility?: string;
    /** ReservedSpaceFacilityEnumeration|s:string|unknown,lounge,hall,meetingpoint,groupPoint,reception,shelter,seats */
    ReservedSpaceFacility?: string;
    /** AccessFacilityEnumeration|s:string|unknown,lift,escalator,travelator,ramp,stairs,shuttle,narrowEntrance,barrier,palletAccess_lowFloor,validator */
    AccessFacility?: string;
    /** TicketingFacilityEnumeration|s:string|unknown,ticketMachines,ticketOffice,ticketOnDemandMachines,ticketSales,mobileTicketing,ticketCollection,centralReservations,localTickets,nationalTickets,internationalTickets */
    TicketingFacility?: string;
    /** RetailFacilityEnumeration|s:string|unknown,food,newspaperTobacco,recreationTravel,hygieneHealthBeauty,fashionAccessories,bankFinanceInsurance,cashMachine,currencyExchange,tourismService,photoBooth */
    RetailFacility?: string;
    /** MobilityFacilityEnumeration|s:string|pti23_255_4,unknown,pti23_16,suitableForWheelChairs,pti23_16_1,lowFloor,pti23_16_2,boardingAssistance,pti23_16_3,stepFreeAccess,tactilePatformEdges,onboardAssistance,unaccompaniedMinorAssistance,audioInformation,visualInformation,displaysForVisuallyImpaired,audioForHearingImpaired */
    MobilityFacility?: string;
    /** PassengerCommsFacilityEnumeration|s:string|unknown,faccomms_1,passengerWifi,pti23_21,telephone,pti23_14,audioServices,pti23_15,videoServices,pti23_25,businessServices,internet,postoffice,letterbox */
    PassengerCommsFacility?: string;
    /** RefreshmentFacilityEnumeration|s:string|unknown,pti23_1,restaurantService,pti23_2,snacksService,pti23,trolley,pti23_18,bar,pti23_19,foodNotAvailable,pti23_20,beveragesNotAvailable,pti23_26,bistro,foodVendingMachine,beverageVendingMachine */
    RefreshmentFacility?: string;
}
