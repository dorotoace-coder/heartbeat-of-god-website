# Marriage & Counselling development

## Local review modes

Run `npm run dev -- --hostname 127.0.0.1 --port 3120`.

- `/marriage-preview` is a development-only interaction demo with fictional fixtures and in-memory edits. Reload resets it. It returns 404 in production and must never be repurposed as a live service.
- `/marriages` is the authenticated workspace. It returns 404 unless server variable `HBG_MARRIAGES_ENABLED` is `true`. The same server flag controls the care entry in PulseOS. Enabling the page never grants case access.

Configure only the intended local Supabase URL and anon key. No privileged key is used by the browser adapter. No dependencies are added by this module. Do not use real personal records in a review environment.

## Data and access

Five additive migrations build the local module. Existing ministry roles grant no automatic access. Private staff/assignment tables control case creation and scope; the application cannot promote its own staff roles. An authorised operator must provision the initial counsellor separately before activation.

Public RPCs are invoker wrappers. Privileged implementations live in a non-exposed schema, check the authenticated actor and enforce case scope. Direct payload-table API access is revoked; RLS remains enabled as defense in depth. Reads, writes, invitations, consent and exports create metadata-only audit events. Narratives and raw invitation codes are not copied to audit records.

- Assigned counsellors manage care records, structured journey entries and pastoral review.
- Records officers receive the legal person-data projection and the marriage register; no counselling or family-background access.
- Coordinators receive appointment/check-in logistics only.
- Participants edit their own person/RTT records and see explicitly released care/wedding summaries. A partner's sealed answers, private intake, prior-union and referral entries are excluded.
- Other users have no case access. They can submit their own care request without a partner account.

## Enquiries and people

Enquiries collect a name, lane, language and safe reply preferences, with a versioned privacy acknowledgement. They create a private receipt, not membership, newsletter subscription or staff access. Pending requests are retry-safe, can be withdrawn and are limited to one pending request per account. Triage exposes only routing metadata. Acceptance locks the request, creates one assigned case, links the requester's own account/person identity, preserves the intake and sets the case to triaged. No emails or notifications are sent.

Person IDs are separate from login IDs. Unicode names, international contacts, optional birth/legal/nationality/residence details, language and accessibility are supported. Clinical results are not person-profile fields. Participants cannot read or edit a partner's profile. Contact/person data can be reused across episodes only through a reviewed link; case counselling records remain separate.

Account links require an already reviewed participant assignment plus an identity check. Membership linking uses the existing reviewed member-intake-to-directory mapping for that exact account. No name or email match merges people, accounts or households. The module does not write counselling data into the general membership directory.

## RTT and care journey

RTT uses the existing 38-question catalogue across ten pillars. Four health topics show referral guidance rather than result-entry fields: 34 reflection prompts in discernment and 31 in preparation. The case's saved track controls the authenticated questionnaire; the server rejects questions outside that track and restricts RTT to premarital care. Personal/enrichment/crisis care opens its own care updates instead.

Invitations use random 256-bit tokens, hashed at rest, seven-day expiry and a single claim. Claiming a code grants no access. A counsellor must verify identity and approve the link separately. Approval locks the parent case and limits active participants to two, including under concurrent requests. Revocation takes effect for existing sessions. No invitation is automatically emailed or placed in a URL.

Structured records cover intake/background, family introductions/visits, previous unions, sessions, preparation milestones, referrals, couple-selected cultural milestones, aftercare and human pastoral review. Each record preserves author/time/version and amendment history. New-entry retries are idempotent. Coordinators and participants receive separate projections; shared summaries never expose the private note. Existing legacy care-note text is preserved, not silently split or imported.

Case status, next action/due date and track persist. Private next-action text is masked for non-counsellors. No score or automated verdict authorises marriage. Session and referral safeguards require human review; private ministry procedures are not reproduced in public source.

## Marriage register

The register keeps ceremony status separate from registration status and tracks document/authority evidence, applications, corrections, ceremony returns, acknowledgement and official versus commemorative certificates. References and amendments are preserved; evidence creation is retry-safe. Deadlines require a recorded source, with no hard-coded statutory waiting period.

Verified registration requires a reviewed official certificate record, required checklist evidence, actual ceremony details, receipt and acknowledgement. A church commemorative certificate cannot satisfy that requirement. Changed ceremony details require renewed review. Changed required evidence reopens verification and withdraws the released participant update. Expiry is evaluated at the ceremony date; subsequent licence expiry does not automatically invalidate a historical record.

Participants receive only an explicitly released wedding update. The module does not authenticate documents, issue civil certificates, contact government systems or confer authority to officiate. File uploads remain disabled; it stores references to reviewed evidence. Official jurisdiction, venue and officiant authority remain human verification requirements.

## Privacy, retention and errors

Each participant has separate versioned care, partner-sharing, family-contact, follow-up and publicity choices. Care permission is required before saving RTT; sharing requires additional permission. Withdrawal suppresses future partner reads without claiming to erase information already seen. Personal exports include only the person's own answers, consent, profile, enquiries and rights requests.

Access/correction/deletion requests receive human review. A status change does not itself fulfil a request or delete data. Counsellors can record retention-review dates and legal holds. No retention period is invented, and no automatic purge is enabled. Ministry review of the notice, retention schedule, exceptional-access arrangements and named staff is required before real intake.

Writes use expected versions; stale saves return HTTP 409. The adapter checks results and uses independent request deadlines as well as abort signals. Questionnaire saves are per answer: a later failure may leave earlier answers saved, and the UI reports that partial outcome while preserving the draft.

## Verification and release boundary

- `node tests/marriages/model.cjs`: 19 prototype workflow checks.
- `node tests/marriages/questionnaire.cjs`: catalogue and track filtering.
- `node tests/marriages/repository.cjs`: confirmed writes, errors, stale/revoked results and stalled auth/write deadlines.
- SQL suites: use a disposable PostgreSQL 17 database, `psql -v ON_ERROR_STOP=1`, and `tests/marriages/sql/bootstrap.sql`. Apply the first migration and run `access.sql` for the baseline. Apply the remaining module migrations and run `consent.sql`, `journey.sql`, `registry.sql` and `people.sql`. Bootstrap is synthetic auth scaffolding and must never run on a hosted project.
- `tests/marriages/auth-api.cjs`: 60 actual local Auth/REST scenarios, including parallel approvals/saves, expiry, existing-session revocation, enquiry triage, person/member links, exports, consent, sealed/shared boundaries, registry evidence and scoped projections. It is guarded to `http://127.0.0.1:55421`. Supply private fixture paths in `HM_TEST_AUTH_ENV` and `HM_TEST_USERS`; secrets are never printed. The test uses only the named disposable local Docker database for fixture provisioning.
- Browser verification covers PulseOS entry, enquiries, triage, stable person updates/reload, invitation review, consent, RTT saves/reload, structured visits/amendments, case track/status, registry evidence review/history and mobile preview layout.
- Production-mode gates: disabled `/marriages` and `/marriage-preview` return 404; `/admin` stays available without the care link. Existing staff routing/access checks are preserved verbatim in the extracted client component.

The branch does not apply a hosted migration, restore RTT, activate workflows, assign production staff, send messages or deploy. Before production, review the ministry policies and bootstrap plan, then obtain the separate release approval required by repository AGENTS.md. Keep government submissions officer-assisted unless an approved integration is separately established.
