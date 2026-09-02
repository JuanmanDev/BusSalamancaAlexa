# Bus Salamanca on Alexa+ (LLM-based Alexa)

This document explains what changed in Alexa+, why the skill stopped opening for some
users, and what this repository does about it.

## What Amazon says (as of 2026)

* Existing custom skills **keep working on "original" Alexa** and Amazon has announced no
  forced migration or deprecation of custom skills, cards or APL
  ([Introducing AI-native SDKs for Alexa+](https://developer.amazon.com/en-US/blogs/alexa/alexa-skills-kit/2025/02/new-alexa-announce-blog),
  [Deprecated features](https://developer.amazon.com/en-US/docs/alexa/ask-overviews/deprecated-features.html)).
* On **Alexa+** the assistant is an LLM. It decides *itself* whether a request should be
  routed to a skill, based on the skill's **name, description, example phrases, keywords and
  interaction model**, and on the skill answering `CanFulfillIntentRequest` correctly.
  "Alexa, abre Bus Salamanca" is no longer a guaranteed literal command – the model may
  answer with its own knowledge, ask a clarifying question or say it cannot do that.
* Amazon asks developers that want their **existing skill to be considered for direct
  invocation on Alexa+** to submit it through the evaluation form linked from the blog post
  above (section *"Existing skills"*). **This is a manual step the skill owner must do in the
  developer console / that form – it cannot be done from code.**
* New, first-class Alexa+ integrations use the **Alexa AI Action SDK** (an OpenAPI-described
  REST API that the LLM calls directly). It is currently in a gated early-access program.
  This repo already exposes such an API (`openapi.yaml`, `/api/action/...`) so the skill can be
  onboarded as an Action when the program opens.

## What changed in this repository

### 1. Skill code (`src/`)

| Change | Why it matters on Alexa+ |
|---|---|
| `CanFulfillIntentRequest` handler + `CAN_FULFILL_INTENT_REQUEST` interface in the manifest | Lets Alexa route *name-free* requests ("¿cuándo llega el autobús a la parada 199?") to the skill. |
| Robust slot parsing (`src/utils/StopNumberParser.ts`) | The LLM fills slots liberally: `"ciento noventa y nueve"`, `"parada 199"`, `"la 199"`, `"?"`. Classic `Number(slot.value)` returned `NaN` and the skill looked broken. |
| Explicit `shouldEndSession` on every response, `reprompt` only when a question was asked | Alexa+ rejects/ends sessions that are left half-open (speech with no reprompt and `shouldEndSession=false`). |
| `AMAZON.FallbackIntent`, `RepeatIntent`, `Yes/NoIntent`, `NavigateHomeIntent` + catch-all `UnknownIntentHandler` | Alexa+ frequently sends built-in intents the old model never sent. Previously they hit the generic error handler. |
| `StopNumberOnlyIntent` + `pendingAction` session attribute | Users can answer "la 199" after the skill asks for a stop number. |
| Single card per response (was `withSimpleCard` **and** `withStandardCard`) | Two cards is an invalid response; the LLM layer is stricter than classic Alexa about invalid JSON. |
| SIRI timeout 8 s → 5.5 s (`SIRI_TIMEOUT_MS`) | Alexa allows 8 s total; the old timeout left zero headroom → "the skill is not responding". |
| Speech includes stop address, shorter texts | LLM summarises spoken output; concise, well-formed text survives better. |
| Request/response logging interceptors | See exactly what Alexa+ sends (`[REQ] type=… intent=… slots=…`). |
| `ALEXA_SKILL_ID` env → `withSkillId()` | Recommended security hardening. |

### 2. Skill package (`skill-package/`)

* `skill.json` – manifest with a long natural-language **description**, **keywords**, example
  phrases and both interfaces (`ALEXA_PRESENTATION_APL`, `CAN_FULFILL_INTENT_REQUEST`).
  The LLM reads these to decide when to use the skill – keep them descriptive.
* `interactionModels/custom/es-ES.json` – interaction model with ~120 sample utterances written
  as **questions, verbs and nouns** ("cuándo llega…", "consulta…", "parada 199"), the new
  `StopNumberOnlyIntent`, `AMAZON.FallbackIntent` (sensitivity LOW) and the other built-ins.

Deploy them with the [ASK CLI](https://developer.amazon.com/en-US/docs/alexa/smapi/quick-start-alexa-skills-kit-command-line-interface.html):

```bash
npm i -g ask-cli
ask configure
SKILL=amzn1.ask.skill.ec146a34-f92a-4889-893f-c245bedfd6cc
ask smapi update-skill-manifest -s $SKILL -g development --manifest "file:skill-package/skill.json"
ask smapi set-interaction-model -s $SKILL -g development -l es-ES --interaction-model "file:skill-package/interactionModels/custom/es-ES.json"
# both are asynchronous; poll them
ask smapi get-skill-status -s $SKILL --resource manifest
ask smapi get-skill-status -s $SKILL --resource interactionModel
```

Two things Amazon rejects that are easy to trip over: `smallIconUri` must be 108x108 and
`largeIconUri` 512x512 (both are served from the web app, `/alexa-icon-*.png`), and
`fallbackIntentSensitivity` is only supported in English and German locales, so es-ES must not
carry it.

…or paste the JSON into the developer console (*Build → Interaction Model → JSON Editor*).
After changing the model, **rebuild it in the console and re-certify** the skill so the live
version gets the new utterances/interfaces.

### 3. Where it runs

The skill backend used to be an AWS Lambda (`arn:aws:lambda:eu-west-1:…:function:BusSalamanca`),
and the workflow that deployed it had been broken since the code moved to Express — it zipped a
`dist/index.js` that no longer exists — so the live skill was answering from a stale zip. It now
runs as the `alexa` service on the Oracle ARM host beside the web app (see [DEPLOY.md](DEPLOY.md)),
at `https://bus-alexa.juanman.tech/`.

Done, in the *development* stage of the skill:

* manifest uploaded — endpoint `https://bus-alexa.juanman.tech/`, `CAN_FULFILL_INTENT_REQUEST`
  and `ALEXA_PRESENTATION_APL` enabled;
* es-ES interaction model uploaded and built (113 sample utterances, `StopNumberOnlyIntent`
  and the built-ins);
* verified against the live endpoint with `ask smapi invoke-skill-end-point`: `LaunchRequest`
  asks for a stop and keeps the session open, `CanFulfillIntentRequest` answers `YES` for
  `"ciento noventa y nueve"`, and `CheckAnyStopIntent` with `"parada ciento noventa y nueve"`
  answers with stop 199, its address and the next arrival.

### 4. What is left, and only the skill owner can do it

1. **Submit for certification.** Development is ahead of live; until the skill is re-certified,
   real users still reach the old Lambda. In *testing instructions* mention that the skill
   answers `CanFulfillIntentRequest` and works name-free.
2. **Fill in Amazon's Alexa+ existing-skill evaluation form** (link in the Feb-2025 blog post).
3. Watch the server logs for `[REQ]` lines — new intents and slot formats coming from Alexa+
   show up there first:
   ```bash
   ssh -F /dev/null -i ~/.ssh/id_rsa opc@79.72.51.163 'docker logs -f bussalamancaalexa-skill'
   ```

Two notes on the move off Lambda: the skill's availability is now the server's availability,
where Lambda was managed; and stop preferences live in SQLite on that host (`/data/storage.db`,
bind-mounted from `/docker/bussalamancaalexa/bus-data`), not in DynamoDB, so users who saved a
stop under the Lambda version start empty.

## Testing locally

```bash
VERIFY_SIGNATURE=false npm run dev      # terminal 1
npm run test:local                       # terminal 2 – 13 request types incl. CanFulfillIntentRequest
```
