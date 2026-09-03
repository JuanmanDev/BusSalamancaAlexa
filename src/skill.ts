import { SkillBuilders } from 'ask-sdk-core';
import { Handlers } from './handlers/index.js';
import { SQLiteStorage } from './services/StorageService.js';

const storageService = new SQLiteStorage();
const handlers = new Handlers(storageService);

/**
 * Optional: restrict requests to this skill id. Set ALEXA_SKILL_ID=amzn1.ask.skill.xxxx in the
 * environment to reject requests coming from any other skill (recommended in production).
 */
const skillId = process.env.ALEXA_SKILL_ID;

let builder = SkillBuilders.custom()
    .addRequestInterceptors(handlers.LoggingRequestInterceptor)
    .addResponseInterceptors(handlers.RememberSpeechResponseInterceptor)
    .addRequestHandlers(
        // Name-free / Alexa+ routing support — must run before everything else
        handlers.CanFulfillIntentRequestHandler,
        handlers.LaunchRequestHandler,
        handlers.CheckStopIntentHandler,
        handlers.CheckAnyStopIntentHandler,
        handlers.CheckMyStopIntentHandler,
        handlers.AddStopIntentHandler,
        handlers.StopNumberOnlyIntentHandler,
        handlers.HelpIntentHandler,
        handlers.RepeatIntentHandler,
        handlers.YesNoIntentHandler,
        handlers.FallbackIntentHandler,
        handlers.CancelAndStopIntentHandler,
        handlers.SessionEndedRequestHandler,
        // Echo Show widget lifecycle — arrives outside any conversation
        handlers.WidgetInstalledHandler,
        handlers.WidgetRemovedHandler,
        handlers.WidgetErrorHandler,
        // Catch-all for any IntentRequest not listed above (keep last)
        handlers.UnknownIntentHandler,
    )
    .addErrorHandlers(handlers.ErrorHandler);

if (skillId) {
    builder = builder.withSkillId(skillId);
}

export const skill = builder.create();
