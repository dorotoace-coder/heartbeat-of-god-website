// Staff invitations with a fully mocked backend and fictional people. Build with
// NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co, serve on 127.0.0.1:3217,
// then run this file. Any other network host is blocked.
import assert from 'node:assert/strict';
const { chromium, expect } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3217';
const owner = '00000000-0000-4000-8000-000000000001';
const invited = '00000000-0000-4000-8000-000000000011';
const invitations = [];
const offers = { good: { display_name: 'Example Ada', role: 'pastorate', details: { responsibility: 'Field Pastor', assignment: 'Lead the prayer team only.', review_on: '2027-02-01' }, expires_at: '2030-01-01T00:00:00Z', status: 'open', email_matches: true },
  other: { display_name: 'Example Ada', role: 'media', details: {}, expires_at: '2030-01-01T00:00:00Z', status: 'open', email_matches: false },
  used: { display_name: 'Example Ada', role: 'media', details: {}, expires_at: '2030-01-01T00:00:00Z', status: 'accepted', email_matches: true } };
const calls = { invoke: [], accept: 0, revoke: [], password: 0 };
let sendMode = 'ok';

async function session(uid, workspace) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const token = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url'), 'test-only'].join('.');
  if (uid) await context.addInitScript(({ uid, token }) => localStorage.setItem('sb-placeholder-auth-token', JSON.stringify({ access_token: token, refresh_token: 'x', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'person@example.test' } })), { uid, token });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    if (url.hostname !== 'placeholder.supabase.co') return route.abort();
    const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    const path = url.pathname, method = route.request().method();
    if (path === '/auth/v1/user' && method === 'PUT') { calls.password++; return reply({ id: uid, aud: 'authenticated', role: 'authenticated', email: 'person@example.test' }); }
    if (path === '/auth/v1/user') return uid ? reply({ id: uid, aud: 'authenticated', role: 'authenticated', email: 'person@example.test' }) : reply({ message: 'no session' }, 401);
    if (path.endsWith('/rpc/staff_workspace')) return reply(workspace);
    if (path.endsWith('/profiles')) return reply({ full_name: 'Example', role: workspace === 'pastor' ? 'owner' : 'leader' });
    if (path === '/functions/v1/staff-invite') {
      const body = route.request().postDataJSON(); calls.invoke.push(body);
      const current = sendMode; sendMode = 'ok';
      if (current === 'duplicate') return reply({ error: 'refused', code: 'HB037', message: 'open' }, 400);
      if (current === 'send_failed') { invitations.unshift(row(body, null, 'SMTP')); return reply({ error: 'send_failed' }, 502); }
      if (body.action === 'create') invitations.unshift(row(body, new Date().toISOString(), null));
      else { const item = invitations.find(i => i.id === body.id); item.sent_at = new Date().toISOString(); item.send_error = null; }
      return reply({ status: 'sent' });
    }
    if (path.endsWith('/rpc/staff_invite_revoke')) { const { p_id } = route.request().postDataJSON(); calls.revoke.push(p_id); invitations.find(i => i.id === p_id).revoked_at = new Date().toISOString(); return reply(null); }
    if (path.endsWith('/staff_invitations')) return workspace === 'pastor' ? reply(invitations) : reply({ code: '42501', message: 'denied' }, 403);
    if (path.endsWith('/rpc/staff_invite_preview')) { const { p_token } = route.request().postDataJSON(); return offers[p_token] ? reply([offers[p_token]]) : reply({ code: 'HB033', message: 'invalid' }, 400); }
    if (path.endsWith('/rpc/staff_invite_accept')) { calls.accept++; return reply('pastorate'); }
    return reply([]);
  });
  return { context, page };
}
const row = (body, sent, error) => ({ id: body.id, email: body.email.toLowerCase(), display_name: body.name, role: body.role, created_at: new Date().toISOString(),
  expires_at: '2030-01-01T00:00:00Z', sent_at: sent, send_error: error, accepted_at: null, revoked_at: null });

try {
  // Owner invites from the Overview.
  const { context: ownerContext, page } = await session(owner, 'pastor');
  await page.goto(base + '/admin?view=overview');
  const panel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Staff invitations' }) }).last();
  await panel.waitFor();
  const roles = await panel.getByLabel('Role').locator('option').allTextContents();
  assert.deepEqual(roles, ['Choose a role', 'Outreach worker', 'Foundation School teacher', 'Media team', 'Attendance team', 'Pastorate pastor']);
  await expect(panel.getByRole('button', { name: 'Send invitation' })).toBeDisabled();
  await panel.getByLabel('Their name').fill('Example Ada');
  await panel.getByLabel('Their email address').fill('Ada@Example.test');
  await panel.getByLabel('Role').selectOption('pastorate');
  await expect(panel).toContainText('They will be able to: Their written pastoral assignment');
  await panel.getByLabel('Responsibility').fill('Field Pastor');
  await panel.getByLabel('Review date').fill('2027-02-01');
  await panel.getByLabel('Assignment and authority limits').fill('Lead the prayer team only.');
  await panel.getByRole('button', { name: 'Send invitation' }).click();
  await expect(panel.getByRole('status')).toContainText('Invitation sent');
  await expect(panel).toContainText('Sent, waiting for them');
  const sent = calls.invoke[0];
  assert.equal(sent.action, 'create'); assert.equal(sent.role, 'pastorate');
  assert.deepEqual(sent.details, { responsibility: 'Field Pastor', assignment: 'Lead the prayer team only.', review_on: '2027-02-01' });
  assert.ok(!('token' in sent));

  // A refusal from the database is explained; a failed email offers Resend.
  await panel.getByLabel('Their name').fill('Example Ben');
  await panel.getByLabel('Their email address').fill('ben@example.test');
  await panel.getByLabel('Role').selectOption('media');
  sendMode = 'duplicate';
  await panel.getByRole('button', { name: 'Send invitation' }).click();
  await expect(panel.getByRole('status')).toContainText('already waiting');
  sendMode = 'send_failed';
  await panel.getByRole('button', { name: 'Send invitation' }).click();
  await expect(panel.getByRole('status')).toContainText('could not be sent. Use Resend');
  const failed = panel.locator('li').filter({ hasText: 'Example Ben' });
  await expect(failed).toContainText('Not sent yet · last send failed');
  await failed.getByRole('button', { name: 'Resend' }).click();
  await expect(failed).toContainText('Sent, waiting for them');
  assert.equal(calls.invoke.at(-1).action, 'resend');
  await failed.getByRole('button', { name: 'Withdraw' }).click();
  await expect(failed).toContainText('Withdrawn');
  assert.equal(await failed.getByRole('button', { name: 'Resend' }).count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'phone layout overflows');
  await ownerContext.close();

  // The invited person accepts; others are told why they cannot.
  const { context: personContext, page: person } = await session(invited, null);
  await person.goto(base + '/admin?view=invitation&token=good');
  await expect(person.getByRole('heading', { name: 'Staff invitation' })).toBeVisible();
  await expect(person.getByText('Pastorate pastor', { exact: false })).toBeVisible();
  await expect(person.getByText('Lead the prayer team only.')).toBeVisible();
  await person.getByRole('button', { name: 'Accept invitation' }).click();
  await expect(person.getByRole('status').filter({ hasText: 'Accepted' })).toBeVisible();
  assert.equal(calls.accept, 1);
  await person.getByLabel('New password').fill('a-synthetic-pass');
  await person.getByRole('button', { name: 'Save password' }).click();
  await expect(person.getByText('Password saved')).toBeVisible();
  assert.equal(calls.password, 1);
  await person.goto(base + '/admin?view=invitation&token=other');
  await expect(person.getByText('Sign in with the email address the invitation was sent to')).toBeVisible();
  assert.equal(await person.getByRole('button', { name: 'Accept invitation' }).count(), 0);
  await person.goto(base + '/admin?view=invitation&token=used');
  await expect(person.getByText('already been used', { exact: false })).toBeVisible();
  await person.goto(base + '/admin?view=invitation&token=bogus');
  await expect(person.getByRole('alert').filter({ hasText: 'not valid' })).toBeVisible();
  await personContext.close();

  // A leader sees no invitation panel.
  const { context: leaderContext, page: leader } = await session('00000000-0000-4000-8000-000000000002', 'media');
  await leader.goto(base + '/admin?view=overview');
  await leader.waitForTimeout(1500);
  assert.equal(await leader.getByRole('heading', { name: 'Staff invitations' }).count(), 0);
  await leaderContext.close();

  // Signed out: the invitation link survives the trip through sign-in.
  const { context: outContext, page: out } = await session(null, null);
  await out.goto(base + '/admin?view=invitation&token=good');
  await out.waitForURL(/\/login\?callbackUrl=/);
  assert.equal(new URL(out.url()).searchParams.get('callbackUrl'), '/admin?view=invitation&token=good');
  await outContext.close();
  console.log('PASS: owner invite with role details, refusal and failed-send messages, resend, withdraw, acceptance, password, wrong email, used and invalid links, leader view, sign-in return');
} finally { await browser.close(); }
