import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
const load = file => { const exports = {}; runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, URL, URLSearchParams }); return exports; };
const { invitationRoles, invitationStatus, inviteProblem, roleDetails, roleLabel, roleAccess } = load('src/lib/people/invitations.ts');
const { safeCallback } = load('src/lib/auth/callback.ts');

// Only the five agreed roles; never Treasury or administrator.
assert.deepEqual([...invitationRoles.map(([value]) => value)], ['outreach_worker', 'foundation_teacher', 'media', 'attendance', 'pastorate']);
assert.ok(!invitationRoles.some(([value, label]) => /treasur|admin|owner/i.test(value + label)));
assert.equal(roleLabel('pastorate'), 'Pastorate pastor');
assert.match(roleAccess('attendance'), /No scheduling or corrections/);

const row = { expires_at: '2026-12-01T00:00:00Z', sent_at: null, accepted_at: null, revoked_at: null };
const now = new Date('2026-11-28T00:00:00Z');
assert.equal(invitationStatus(row, now), 'not_sent');
assert.equal(invitationStatus({ ...row, sent_at: 'x' }, now), 'sent');
assert.equal(invitationStatus({ ...row, sent_at: 'x' }, new Date('2026-12-02T00:00:00Z')), 'expired');
assert.equal(invitationStatus({ ...row, revoked_at: 'x' }, now), 'revoked');
assert.equal(invitationStatus({ ...row, accepted_at: 'x', revoked_at: null }, new Date('2027-01-01')), 'accepted');

assert.match(inviteProblem('HB034'), /email address the invitation was sent to/);
assert.match(inviteProblem('42501'), /owner account/);
assert.equal(inviteProblem('XX', 'fallback'), 'fallback');
assert.deepEqual({ ...roleDetails('foundation_teacher', { trainedOn: '2026-11-01' }) }, { trained_on: '2026-11-01' });
assert.deepEqual({ ...roleDetails('pastorate', { responsibility: ' Field ', assignment: ' Do X ', reviewOn: '2027-01-01' }) }, { responsibility: 'Field', assignment: 'Do X', review_on: '2027-01-01' });
assert.deepEqual({ ...roleDetails('media', {}) }, {});

// Sign-in returns only to Pulse OS pages on this site.
assert.equal(safeCallback('?callbackUrl=%2Fadmin%3Fview%3Dinvitation%26token%3Dabc'), '/admin?view=invitation&token=abc');
for (const bad of ['', '?callbackUrl=https://evil.example/admin', '?callbackUrl=//evil.example/admin', '?callbackUrl=/partnership',
  '?callbackUrl=/admin\\@evil.example', '?callbackUrl=%2F%2Fevil.example']) {
  assert.equal(safeCallback(bad), '/admin', bad);
}
console.log('PASS: invitable roles, statuses, messages, role details and safe sign-in return');
