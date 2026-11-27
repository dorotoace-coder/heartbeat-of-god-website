# Marriage & Counselling development

## Synthetic preview

Run `npm run dev -- --hostname 127.0.0.1 --port 3120` and open `/marriage-preview`. The development-only page uses fictional fixtures and React state; reload clears edits. It returns 404 in production. It has no real case connection and must not be published as a live service.

The preview covers enquiries, family visits, background, referrals, preparation, sessions, ceremony records and aftercare. The role selector is an interface simulation, not authorization. RTT includes the existing 38-question catalogue across ten pillars, filtered by track. Four health topics display referral guidance rather than result-entry fields: 34 reflection prompts in discernment and 31 in preparation. No files or clinical results are collected.

## Gated authenticated workspace

`/marriages` returns 404 unless the server variable `HBG_MARRIAGES_ENABLED` is `true`. The flag does not grant access. Configure Supabase URL/anon credentials for the intended isolated environment; keep them out of source. No privileged key is used by the browser repository adapter. Do not point a test run at a hosted project.

The two additive migrations create independent care, registry, logistics and authored-response tables. Private staff/assignment tables control access; no existing ministry title is automatically trusted. Provision the first counsellor through a separately authorised database operator. The application cannot promote its own staff roles.

Payload reads/writes use authenticated RPCs. Their public functions are invoker wrappers; privileged implementations live in a non-exposed schema, authenticate the actor and enforce case scope. Direct payload-table Data API access is revoked. RLS remains enabled as defense in depth. Reads, writes, consent events, invitations and participant exports generate metadata-only audit events. Payloads and invitation codes are not copied into audit records.

Invitations use 256-bit random tokens, hashed at rest, with seven-day expiry and single claim. A claim alone grants no case access. The assigned counsellor must separately verify identity and approve the link. A parent-row lock serializes approvals and limits active participants to two. Revocation stops future requests. No invitations are automatically emailed or placed in URLs.

Each participant records separate, versioned choices for care, partner sharing, family contact, follow-up and publicity. Care permission is required before saving RTT answers; shared answers also require partner-sharing permission. Withdrawing sharing suppresses future partner reads, without claiming to erase information already seen. Participants can export only their own answers, consent history and rights requests. Access/correction/deletion requests receive human review; status updates alone do not fulfil them.

Counsellors may record retention-review dates and legal holds. No default retention period is invented and no automated purge is enabled. The record does not yet implement the complete retention fulfilment workflow. Registry status checks require reviewed ceremony evidence, submission receipt and acknowledgement; references alone do not verify document authenticity or authorise a ceremony.

Updates use expected versions. A stale write returns HTTP 409 instead of a retryable PostgreSQL serialization error. The adapter checks returned results and uses abort timeouts. Answer saves are per row, so a later failure may leave earlier answers saved; the UI reports that partial result and preserves the draft. The authenticated UI contains no role simulation switcher.

## Verification

- `node tests/marriages/model.cjs`: prototype rules.
- `node tests/marriages/questionnaire.cjs`: catalogue and track filtering.
- `node tests/marriages/repository.cjs`: adapter write/error/conflict results.
- In a disposable PostgreSQL 17 database only, apply `tests/marriages/sql/bootstrap.sql`, the first migration, and `tests/marriages/sql/access.sql` using `psql -v ON_ERROR_STOP=1`. This tests the baseline before direct access is revoked by the second migration.
- Apply the second migration, then `tests/marriages/sql/consent.sql` to test the final audited RPC model. Tests use synthetic auth scaffolding and rollback transactions; bootstrap must never run on a hosted project.
- `tests/marriages/auth-api.cjs` uses a separate real local Supabase Auth/REST stack, guarded to `http://127.0.0.1:55421`. Set `HM_TEST_AUTH_ENV` to a private `supabase status -o env` file and `HM_TEST_USERS` to a private fixture map with counsellor/partnera/partnerb/outsider/records/coordinator entries containing local ID/email/password. Provision only the fixture counsellor in the local private staff table first. The test creates synthetic records and temporary test assignments through the named local Docker database container. It checks actual JWT sessions, invitations, consent, sealed/shared access, stale writes, staff scopes, own export, audit and revocation. It never prints passwords or tokens.

The privacy/consent notice and retention schedule still require ministry review before real intake. Remaining release work includes structured workflow parity beyond restricted text summaries, production bootstrap/provisioning review, document handling and a separately approved migration/activation/deployment. No government integration, hosted migration or RTT restoration is performed by this branch.

## Structured journey increment

The third migration adds structured intake, visits, prior unions, sessions, preparation, referrals, cultural milestones, aftercare and pastoral review. Entries have revision history, optimistic versions and retry-safe creation keys. Coordinators receive only logistics projections; participants receive only explicitly released summaries, excluding confidential intake, prior-union and referral entries. History remains counsellor-only. Case progress and RTT track persist; non-counsellors never receive private next-action text. The server enforces track-specific questions.

Apply all three migrations to a fresh disposable database, then run `tests/marriages/sql/journey.sql`. The Auth/REST fixture suite now covers 30 scenarios. The journey UI replaces repeated activity summaries with typed entries; the separate legacy care-note editor preserves existing text rather than silently migrating it.

## Registry lifecycle increment

The fourth migration adds document, authority, submission and certificate evidence with immutable revision history and retry-safe creation. Ceremony status and official-registration status are separate. The registry tracks application/authorisation/return/acknowledgement references, corrections and participant-approved updates. Deadlines require a recorded source; no statutory waiting period is hard-coded.

Official verification requires a verified official certificate record, reviewed required evidence and the ceremony/submission fields. A church commemorative certificate cannot satisfy that requirement. Changing reviewed ceremony details requires reopening verification. Changing required evidence after verification reopens the record and withdraws the participant update. Evidence validity is checked at the ceremony date, avoiding a claim that subsequent licence expiry invalidates a historical marriage.

Records officers and assigned counsellors can manage the register. Participants receive only the explicitly released wedding summary; they cannot read the private evidence register. Coordinators have no registry access. The system records a human review and does not contact government systems, authenticate documents, issue official certificates or authorise a ceremony.

Run `tests/marriages/sql/registry.sql` after all four migrations in the disposable database. The Auth/REST suite now covers 40 scenarios. Browser checks cover evidence receipt, review, revision history and reload persistence. File uploads remain disabled; this increment stores document references only.
