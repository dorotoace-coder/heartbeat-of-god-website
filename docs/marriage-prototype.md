# Marriage workspace prototype

Run `npm run dev -- --hostname 127.0.0.1 --port 3120` and open `/marriage-preview`.

The development-only workspace uses fictional fixtures and React state. Reload clears all edits. The route returns 404 in production mode. It is not linked from public navigation and is not a production counselling service.

Supported interaction paths: sample enquiry, case search/filter, family visits, background summary, referral metadata, preparation checklist, appointments, ceremony evidence and aftercare. The role selector demonstrates proposed interface scopes only; it is not authentication or server authorization. Existing RTT answers and files are not imported.

Run `node tests/marriages/model.cjs` for prototype rule checks. Production integration requires verified identity mapping, server/database/storage authorization, audited role assignment, consent and retention controls, error handling and independent negative-access tests. No database credentials, medical uploads, live submissions, emails or government API are used by this prototype.

Before any live intake, replace the state adapter with a separately reviewed authenticated implementation. Do not remove the production route guard to publish this demonstration as a live service.

The RTT panel includes the existing 38-question catalogue across ten pillars, with track filtering. Four clinical topics display referral guidance rather than result-entry fields; the reflection counts are 34 for discernment and 31 for preparation. Sealed/shared visibility and partner preview are client-only simulations. Answers are kept per fictional case after explicitly keeping them in the preview; reload clears them. Run `node tests/marriages/questionnaire.cjs` to verify catalogue counts and track filtering.

## Dormant authenticated workspace

A separate `/marriages` route uses Supabase Auth and database-enforced case assignments. It returns 404 unless the server variable `HBG_MARRIAGES_ENABLED` equals `true`. This flag is not authorization: the database denies access without an explicit assignment. No accounts are provisioned by the migration and no existing ministry title grants access.

The additive migration creates case summaries and separate counselling, registry, logistics and response tables. Private staff/assignment tables control creation and access; API clients cannot edit them. The response author controls sealed/shared visibility. Counsellors can read assigned answers, but cannot edit a participant's answers. Document uploads are not enabled. Clinical question keys are rejected. Writes produce metadata-only audit entries; update versions reject stale edits. Registry verification requires reviewed evidence, receipt and acknowledgement. These controls do not independently verify document authenticity.

The repository adapter checks actual write results, applies abort timeouts and reports conflict/revocation. Questionnaire saves are per answer: a later failure may leave earlier answers saved, and the UI reports that outcome rather than claiming a batch transaction.

For local SQL tests, use a disposable PostgreSQL 17 database with `tests/marriages/sql/bootstrap.sql`, then the new migration, then `tests/marriages/sql/access.sql`, all with `psql -v ON_ERROR_STOP=1`. Bootstrap creates synthetic auth scaffolding and must never run against hosted databases. Access tests run inside a rollback transaction. `node tests/marriages/repository.cjs` checks error/conflict handling with a mock adapter; this is distinct from the real SQL authorization suite.

Production integration remains gated: no hosted migration was applied, no flag enabled, no staff or participant assigned and no RTT database restored. Remaining release work includes an authenticated browser test against an isolated full Supabase stack, reviewed participant linking/provisioning, read/export audit, consent history/retention controls, document handling and complete structured workflow parity with the local prototype. Do not treat the generic counselling text fields as the final structured case-management implementation.
