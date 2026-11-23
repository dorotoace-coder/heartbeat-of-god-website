# Training release notes

Training extends the existing workspace and authentication. It adds its own curriculum, enrolment, progress, equivalence and audit tables. It does not grant access to financial, attendance or private care records, and it does not appoint workers to departments.

## Review and release

1. Apply the workers-training migration in an isolated database first. Exercise anonymous, unassigned, learner, assigned reviewer, editor and pastoral roles. Repeat with the deployment's optional session extensions enabled.
2. Back up the existing database and record the app revision before an approved production release. Apply the additive migration through the normal reviewed migration workflow; do not reset the database.
3. Keep internal curriculum JSON outside this public repository. A pastor imports each module through Training administration, checks its department mapping, reviews the teaching and submits the saved draft. Only pastoral approval publishes it. Test-fixture publication is not content approval.
4. Enrol existing people and assign their reviewers. Link an existing confirmed account when available; an in-person learner can remain accountless. Link the existing Foundation class where applicable. Never create real attendance or financial entries for training.
5. Verify the deployed reader, editor, print and progress flows with authorised accounts. Confirm that non-pastoral users see only their own or assigned learner records, and that training permission does not open other workspaces.

## Completion rules

Reading is available across published departments for enrolled workers. Each knowledge check requires all three answers correct and supports retries. A reviewer confirms attendance or recovery teaching and observed practical work, with evidence. Learners cannot approve themselves. Department completion requires current Foundation approval or recorded pastoral recognition of equivalent prior learning. A new published revision retains old evidence but requires a new assessment for that revision.

Private HTML downloads contain reading material only. They do not contain personal progress and do not synchronise offline answers. Browser printing includes every lesson, scripts, drills, checklists and questions, regardless of the selected reading panel.

## Verification

Run `node scripts/test-training.mjs`, `npx tsc --noEmit`, targeted ESLint and `bash scripts/check-public-safe.sh`. The content test accepts an optional path to an approved private directory of thirteen module JSON files. Run `npm run build`; `npm run build -- --webpack` is the supported alternative when a sandbox prevents Turbopack from binding its build-worker port.

Database and browser verification must additionally cover attempted privilege escalation, forged progress, self-approval, Foundation prerequisites, stale drafts, revision isolation, assigned in-person registers, persisted quiz retries, and mobile navigation. Inspect every exported PDF for missing sections, clipping and trailing pages.

## Rollback

Redeploy the previous app revision if a release fails. Preserve the additive training tables and their audit history while investigating. Do not drop learner records, overwrite operational tables, or remove a published revision to hide a failed release. Restore data only from a reviewed backup and an explicit recovery plan.
