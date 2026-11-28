import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
const exports = {};
runInNewContext(ts.transpileModule(readFileSync('src/lib/people/links.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports });
const { summariseLinks, describeReasons, linkProblem, isUnconfirmedDirectoryPerson, offerForSchool, recordKindLabels, summarisePermissions, permissionProblem } = exports;

const links = summariseLinks([
  { id: 'l1', person_id: 'p1', source_key: 'k1' }, { id: 'l2', person_id: 'p1', source_key: 'k2' },
  { id: 'l3', person_id: 'p2', source_key: 'k3' }, { id: 'l4', person_id: 'p9', source_key: 'k4' },
], { p1: 'Example One', p2: 'Example Two' });
assert.deepEqual({ ...links.k1 }, { linkId: 'l1', personId: 'p1', name: 'Example One', otherContacts: 1 });
assert.equal(links.k3.otherContacts, 0);
assert.equal(links.k4.name, 'Person record unavailable');
assert.equal(describeReasons(['same_email', 'same_phone', 'other']), 'same email, same phone, other');

assert.deepEqual({ ...linkProblem(null, 0) }, { message: 'Not saved. Check your connection and try again.', retry: true, refresh: false });
assert.equal(linkProblem('HB011', 400).refresh, true);
assert.equal(linkProblem('HB011', 400).retry, false);
assert.equal(linkProblem('HB014', 400).refresh, false);
assert.match(linkProblem('42501', 403).message, /owner account/);
assert.equal(linkProblem('XX000', 503).retry, true);
assert.match(linkProblem(undefined, 400).message, /Try again/);

assert.equal(isUnconfirmedDirectoryPerson('program_directory', false), true);
assert.equal(isUnconfirmedDirectoryPerson('program_directory', true), false);
assert.equal(isUnconfirmedDirectoryPerson('staff', false), false);
assert.equal(isUnconfirmedDirectoryPerson(undefined, false), false);
assert.equal(offerForSchool({ origin: 'program_directory' }, false), false);
assert.equal(offerForSchool({ origin: 'program_directory', requests_school: true }, false), true);
assert.equal(offerForSchool({ origin: 'program_directory' }, true), true);
assert.equal(offerForSchool({ origin: 'staff' }, false), true);
assert.equal(linkProblem('HB017', 400).refresh, true);
assert.match(linkProblem('HB017', 400).message, /earlier details/);
assert.equal(recordKindLabels.mta_registration, 'Mighty Turn Around registration');
assert.equal(recordKindLabels.member_profile, 'Member profile');
const row = (purpose, extra) => ({ address: 'a@example.test', purpose, decision: null, method: null, recorded_at: null, suppressed: false, allowed: false, ...extra });
const states = summarisePermissions([row('event_invitation', { decision: 'granted', allowed: true }), row('ministry_news', { decision: 'withdrawn' }), row('greetings')]);
assert.deepEqual({ ...states['a@example.test'] }, { event_invitation: 'allowed', ministry_news: 'withdrawn', greetings: 'unknown' });
assert.equal(summarisePermissions([row('greetings', { decision: 'granted', suppressed: true })])['a@example.test'].greetings, 'suppressed');
assert.match(permissionProblem('HB022'), /question you asked/);
assert.equal(permissionProblem('HB011'), null);
assert.match(linkProblem('HB021', 400).message, /email address/);
console.log('PASS: link summaries, reasons, error handling, membership badge, school list rule, record labels, permission states');
