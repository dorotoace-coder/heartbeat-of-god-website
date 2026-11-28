import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
const board = {};
runInNewContext(ts.transpileModule(readFileSync('src/lib/followup/board.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: board, Intl, Date });
const exports = {};
runInNewContext(ts.transpileModule(readFileSync('src/lib/followup/directory.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, require: () => board, Date, Intl });
const { filterDirectory, describeEvidence, refreshProblem, summariseLinks, linkStatus, linkRejection } = exports;
const base = { import_key: 'k1', display_name: 'Example Person', email: 'person@example.test', phone_original: '+1 204 555 0101',
  programs: ['MTA'], review_flags: [], relationship: 'unconfirmed', attendance: 'unknown' };
const all = { query: '', program: '', relationship: '', attendance: '' };
const rows = [base, { ...base, import_key: 'k2', display_name: 'Second', email: 'second@example.test', phone_original: '', programs: ['ILPC'], relationship: 'review' }];
assert.equal(filterDirectory(rows, all).length, 2);
assert.equal(filterDirectory(rows, { ...all, program: 'ILPC' })[0].import_key, 'k2');
assert.equal(filterDirectory(rows, { ...all, relationship: 'review' }).length, 1);
assert.equal(filterDirectory(rows, { ...all, query: '  555 0101 ' }).length, 1);
assert.equal(filterDirectory(rows, { ...all, query: 'SECOND@' }).length, 1);
assert.equal(filterDirectory([{ ...base, phone_original: null }], { ...all, query: 'zzz' }).length, 0);
// Older RPC (relationship only) still describes evidence.
assert.deepEqual([...describeEvidence({ ...base, relationship: 'worker' })], ['Worker account matched', 'Attendance unknown']);
assert.deepEqual([...describeEvidence(base)], ['Membership unconfirmed', 'Attendance unknown']);
// New RPC: worker and member shown together, departments kept.
assert.deepEqual([...describeEvidence({ ...base, relationship: 'worker', worker_match: true, member_match: true, worker_departments: ['media', 'attendance'], attendance: 'mta_attended' })],
  ['Worker account matched: Media, Attendance', 'Member confirmed', 'MTA attendance confirmed']);
assert.deepEqual([...describeEvidence({ ...base, relationship: 'review', worker_match: false, member_match: false, review_reasons: ['shared_phone', 'member_details_differ'] })],
  ['Needs review: Phone shared with another contact; Membership profile has different details', 'Attendance unknown']);
assert.deepEqual([...describeEvidence({ ...base, relationship: 'review', review_reasons: ['new_reason'] })], ['Needs review: new_reason', 'Attendance unknown']);
assert.match(refreshProblem(0), /Retry when connected/);
assert.match(refreshProblem(403), /Check your access/);
assert.match(refreshProblem(401), /Check your access/);
assert.match(refreshProblem(400, '42501'), /Check your access/);
assert.match(refreshProblem(500), /Retry in a moment/);
const row = (key, extra) => ({ directory_import_key: key, followup_date: '2026-12-01', completed_at: null, closure_outcome: null, ...extra });
const links = summariseLinks([
  row('open'), row('open', { completed_at: '2026-11-01T10:00:00Z', closure_outcome: 'completed' }),
  row('closed', { completed_at: '2026-11-02T10:00:00Z', closure_outcome: 'completed' }),
  row('closed', { completed_at: '2026-11-20T23:30:00Z', closure_outcome: 'completed' }),
  row('declined', { completed_at: '2026-11-03T10:00:00Z', closure_outcome: 'declined' }), row('declined'),
]);
assert.deepEqual({ ...linkStatus(links.open) }, { text: 'Follow-up open, next contact 2026-12-01', canPrepare: false });
assert.deepEqual({ ...linkStatus(links.closed) }, { text: 'Previous follow-up closed 2026-11-21', canPrepare: true }); // West Africa date
assert.deepEqual({ ...linkStatus(links.declined) }, { text: 'Asked for no further contact', canPrepare: false });
assert.deepEqual({ ...linkStatus(undefined) }, { text: '', canPrepare: true });
for (const code of ['HB001', 'HB002', 'HB003', 'HB004']) assert.ok(linkRejection(code));
assert.equal(linkRejection('P0001'), null);
assert.equal(linkRejection(undefined), null);
console.log('PASS: directory filters, evidence descriptions, refresh messages, follow-up link status');
