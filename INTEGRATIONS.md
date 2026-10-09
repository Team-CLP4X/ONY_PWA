# ONY integration readiness

ONY currently uses local React state and scripted responses. The interfaces in
`src/services/contracts.ts` define replacement boundaries; they are not live
integrations.

## Working frontend flows

- Prototype account entry, validation, forgot-password state, display name, and consent.
- Persona/language/memory onboarding and editable profile preferences.
- Separate conversations, folder creation/rename/delete, move, archive, search, and reopen.
- User-controlled memories and monthly-report inclusion.
- Local report summaries based only on currently included local data.
- Community hierarchy from world to broad local area with individual, opted-in mock user nodes.
- Independent globe visibility and supportive-message permissions; node brightness reflects
  optional mood check-ins only and never message availability.
- Text and voice support-message preview, cancellation, simulated send, block, and report controls.
- Local mood check-ins, history, report inclusion controls, deletion, and simple trends after enough entries.
- Simulated lower, moderate, and potential-immediate-danger safety scenarios.
- Manual-area and permission-choice interfaces for community and support discovery.

## Simulated functionality

- Account registration, login, reset email, and logout session.
- AI responses, transcription, risk classification, monthly generation, moderation, and analytics.
- Trusted-contact calls/messages, community message delivery, voice storage, location permission, map users, providers, distances, and availability.
- Payments, vouchers, notifications, data export/deletion guarantees, and persistent storage.

## Required integrations

1. **Authentication:** managed auth provider, server-side sessions, email verification,
   password reset, rate limiting, account recovery, and audit events.
2. **Application API/database:** encrypted persistent profiles, consent records,
   conversations, folders, memories, reports, deletion jobs, and authorization checks.
3. **Gemini:** server-side adapter implementing `AIService`. The server must construct
   reviewed system/safety instructions separately from user content and send only the
   current conversation plus explicitly approved, relevant context.
4. **Safety layer:** evaluated input/output classifiers, deterministic escalation rules,
   expert-reviewed crisis copy, monitoring, red-team testing, and incident response.
5. **Maps/community:** opted-in discoverability, privacy-preserving coordinates, coarse
   geographies, secure messaging and voice storage, moderation, blocking, abuse prevention,
   and permission-controlled optional geolocation.
6. **Support directory:** authoritative provider sources, credential checks, verification
   timestamps, current contact details, and a process for corrections.

## Security, privacy, and safety before launch

- Keep all API keys and provider credentials server-side; never expose them through Vite.
- Complete threat modelling, access-control testing, secure logging, encryption,
  retention/deletion workflows, backups, breach response, and dependency review.
- Complete legal/privacy review and publish accurate terms, consent versions, subprocessors,
  data locations, model-retention settings, and user-rights procedures.
- Validate accessibility, localization, moderation, bias mitigation, age requirements,
  and crisis flows with qualified experts and representative users.
- Do not describe ONY as production-ready or clinically validated until these controls,
  integrations, operational processes, and independent testing are complete.
