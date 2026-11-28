// Registration links, person records and restoring earlier details, with a fully
// mocked backend and fictional people. Build with
// NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co, serve on 127.0.0.1:3217,
// then run this file. Any other network host is blocked.
import assert from 'node:assert/strict';
const { chromium, expect } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
page.setDefaultTimeout(10000);
const uid = '00000000-0000-4000-8000-000000000001';
const contact = { import_key: 'k-ada', display_name: 'Example Ada', email: 'ada@example.test', phone_original: '+1 204 555 0100', programs: ['MTA'],
  review_flags: [], relationship: 'unconfirmed', attendance: 'unknown', worker_match: false, member_match: false, worker_departments: [], review_reasons: [] };
const person = { id: 'p-ada', full_name: 'Example Ada', phone: '+1 204 555 0100', address: null, social_contact: null, requests_school: false, origin: 'program_directory' };
const registrations = [
  { registration_id: 'r-1', full_name: 'Example Ada', registered_at: '2026-07-01T10:00:00Z', same_phone: true, linked_person: null, link_id: null },
  { registration_id: 'r-2', full_name: 'Example A', registered_at: '2026-07-02T10:00:00Z', same_phone: false, linked_person: 'p-other', link_id: 'l-other' },
];
const revisions = [{ id: 41, full_name: 'Example Ada Old', phone: '+1 204 555 0199', address: null, social_contact: null, replaced_at: '2026-11-20T10:00:00Z' }];
let linkMode = 'ok';
const calls = [];
const token = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url'), 'test-only'].join('.');
await context.addInitScript(({ uid, token }) => localStorage.setItem('sb-placeholder-auth-token', JSON.stringify({ access_token: token, refresh_token: 'synthetic-only', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'test@example.com' } })), { uid, token });
await page.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.hostname === '127.0.0.1') return route.continue();
  if (url.hostname !== 'placeholder.supabase.co') return route.abort();
  const path = url.pathname;
  const body = () => route.request().postDataJSON();
  const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
  if (path === '/auth/v1/user') return reply({ id: uid, aud: 'authenticated', role: 'authenticated', email: 'test@example.com' });
  if (path.endsWith('/rpc/staff_workspace')) return reply('pastor');
  if (path.endsWith('/profiles')) return reply({ full_name: 'Example Pastor', role: 'owner' });
  if (path.endsWith('/rpc/program_directory_current')) return reply([contact]);
  if (path.endsWith('/person_source_links')) return reply([{ id: 'l-ada', person_id: 'p-ada', source_key: 'k-ada' }]);
  if (path.endsWith('/congregation_people')) return reply(url.searchParams.get('id') ? [{ id: person.id, full_name: person.full_name }] : [person]);
  if (path.endsWith('/rpc/person_registrations')) return reply(registrations);
  if (path.endsWith('/rpc/person_link')) {
    const sent = body(); calls.push(['link', sent]);
    const mode = linkMode; linkMode = 'ok';
    if (mode === 'offline') return route.abort('failed');
    const row = registrations.find(item => item.registration_id === sent.p_source_key);
    row.linked_person = sent.p_person; row.link_id = sent.p_link;
    return reply(sent.p_person);
  }
  if (path.endsWith('/rpc/person_records')) return reply([
    { record_kind: 'followup', link_id: null, title: 'Example Ada', detail: 'open, next contact 2026-12-01', occurred_at: '2026-11-27T10:00:00Z' },
    { record_kind: 'directory_contact', link_id: 'l-ada', title: 'Example Ada', detail: 'MTA', occurred_at: '2026-11-26T10:00:00Z' },
  ]);
  if (path.endsWith('/person_revisions')) return reply(revisions);
  if (path.endsWith('/rpc/person_restore')) { calls.push(['restore', body()]); person.full_name = 'Example Ada Old'; return reply(null); }
  return reply([]);
});
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3217';
try {
  await page.goto(base + '/admin?view=followup');
  const card = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Past program contacts' }) }).last()
    .locator('li').filter({ has: page.getByRole('heading', { name: 'Example Ada', exact: true }) });
  await expect(card).toContainText('Linked to Example Ada');

  // Registrations: confirmation required, offline retry keeps the id, evidence follows the phone match.
  await card.getByRole('button', { name: 'Show registrations' }).click();
  await expect(card).toContainText('Example Ada · ');
  await expect(card).toContainText('same phone');
  await expect(card).toContainText('Linked to another person');
  await card.getByRole('button', { name: 'Link to Example Ada' }).click();
  const save = card.getByRole('button', { name: 'Save link' });
  await expect(save).toBeDisabled();
  await card.getByRole('checkbox', { name: 'I checked this registration is Example Ada.' }).check();
  linkMode = 'offline';
  await save.click();
  await expect(card.getByRole('alert')).toContainText('Check your connection');
  await save.click();
  await expect(card.getByText('Linked to Example Ada', { exact: true }).nth(1)).toBeVisible();
  const linkCalls = calls.filter(([kind]) => kind === 'link');
  assert.equal(linkCalls.length, 2);
  assert.equal(linkCalls[0][1].p_link, linkCalls[1][1].p_link, 'retry reuses the request id');
  assert.equal(linkCalls[1][1].p_source_type, 'mta_registration');
  assert.equal(linkCalls[1][1].p_person, 'p-ada');
  assert.deepEqual(linkCalls[1][1].p_evidence, ['same_email', 'same_phone']);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'phone layout overflows');

  // People: linked records and restoring earlier details.
  await page.goto(base + '/admin?view=members');
  await page.locator('summary').filter({ hasText: 'Example Ada' }).first().click();
  await expect(page.getByText('Linked records')).toBeVisible();
  await expect(page.getByText('open, next contact 2026-12-01', { exact: false })).toBeVisible();
  await expect(page.getByText('Program contact:', { exact: false })).toBeVisible();
  await expect(page.getByText('Example Ada Old', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Restore these details' }).click();
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect.poll(() => calls.filter(([kind]) => kind === 'restore').length).toBe(1);
  assert.equal(calls.find(([kind]) => kind === 'restore')[1].p_revision, 41);
  await page.setViewportSize({ width: 1440, height: 1000 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'desktop layout overflows');
  console.log('PASS: registration list, confirmation, offline retry, evidence, linked records, earlier details, restore, layouts');
} finally { await browser.close(); }
