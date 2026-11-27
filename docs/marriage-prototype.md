# Marriage workspace prototype

Run `npm run dev -- --hostname 127.0.0.1 --port 3120` and open `/marriage-preview`.

The development-only workspace uses fictional fixtures and React state. Reload clears all edits. The route returns 404 in production mode. It is not linked from public navigation and is not a production counselling service.

Supported interaction paths: sample enquiry, case search/filter, family visits, background summary, referral metadata, preparation checklist, appointments, ceremony evidence and aftercare. The role selector demonstrates proposed interface scopes only; it is not authentication or server authorization. Existing RTT answers and files are not imported.

Run `node tests/marriages/model.cjs` for prototype rule checks. Production integration requires verified identity mapping, server/database/storage authorization, audited role assignment, consent and retention controls, error handling and independent negative-access tests. No database credentials, medical uploads, live submissions, emails or government API are used by this prototype.

Before any live intake, replace the state adapter with a separately reviewed authenticated implementation. Do not remove the production route guard to publish this demonstration as a live service.

The RTT panel includes the existing 38-question catalogue across ten pillars, with track filtering. Four clinical topics display referral guidance rather than result-entry fields; the reflection counts are 34 for discernment and 31 for preparation. Sealed/shared visibility and partner preview are client-only simulations. Answers are kept per fictional case after explicitly keeping them in the preview; reload clears them. Run `node tests/marriages/questionnaire.cjs` to verify catalogue counts and track filtering.
