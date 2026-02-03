import { SkillBuilders } from 'ask-sdk-core';
import { Handlers } from './handlers/index.js';
import { SQLiteStorage } from './services/StorageService.js';

const storageService = new SQLiteStorage();
const handlers = new Handlers(storageService);

export const skill = SkillBuilders.custom()
    .addRequestHandlers(
        handlers.LaunchRequestHandler,
        handlers.CheckStopIntentHandler,
        handlers.CheckAnyStopIntentHandler,
        handlers.CheckMyStopIntentHandler,
        handlers.AddStopIntentHandler,
        handlers.HelpIntentHandler,
        handlers.CancelAndStopIntentHandler,
        handlers.SessionEndedRequestHandler
    )
    .addErrorHandlers(handlers.ErrorHandler)
    .create();
