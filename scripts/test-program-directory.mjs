import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
const exports = {};
runInNewContext(ts.transpileModule(readFileSync('src/lib/followup/directory.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports });
const { filterDirectory, describeEvidence } = exports;
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
console.log('PASS: directory filters, legacy and evidence descriptions');
