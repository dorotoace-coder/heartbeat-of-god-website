// Directory-linked follow-up flow with a fully mocked backend and fictional people.
// Build with NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co, serve on
// 127.0.0.1:3217, then run this file. Any other network host is blocked.
import assert from 'node:assert/strict';
const { chromium, expect } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
page.setDefaultTimeout(10000);
const uid = '00000000-0000-4000-8000-000000000001';
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const contact = (key, name, extra) => ({ import_key: key, display_name: name, email: `${key}@example.test`, phone_original: '+1 204 555 0100',
  programs: ['MTA'], review_flags: [], relationship: 'unconfirmed', attendance: 'unknown', worker_match: false, member_match: false,
  worker_departments: [], review_reasons: [], ...extra });
const directory = [contact('k-eligible', 'Example Eligible'), contact('k-second', 'Example Second'), contact('k-open', 'Example Open'),
  contact('k-declined', 'Example Declined'), contact('k-review', 'Example Review', { relationship: 'review', review_reasons: ['shared_phone'] })];
const requests = [
  { id: 'open-1', directory_import_key: 'k-open', kind: 'ministry', full_name: 'Example Open', phone: null, followup_date: today, assigned_to: null, completed_at: null, closure_outcome: null },
  { id: 'declined-1', directory_import_key: 'k-declined', kind: 'ministry', full_name: 'Example Declined', phone: null, followup_date: today, assigned_to: null, completed_at: '2026-11-01T10:00:00Z', closure_outcome: 'declined' },
];
let workspace = 'pastor', nextCreate = 'ok', linksFail = false;
const payloads = [];
const token = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url'), 'test-only'].join('.');
await context.addInitScript(({ uid, token }) => localStorage.setItem('sb-placeholder-auth-token', JSON.stringify({ access_token: token, refresh_token: 'synthetic-only', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'test@example.com' } })), { uid, token });
await page.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.hostname === '127.0.0.1') return route.continue();
  if (url.hostname !== 'placeholder.supabase.co') return route.abort();
  const path = url.pathname;
  const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (path === '/auth/v1/user') return reply({ id: uid, aud: 'authenticated', role: 'authenticated', email: 'test@example.com' });
  if (path.endsWith('/rpc/staff_workspace')) return reply(workspace);
  if (path.endsWith('/profiles')) return reply({ full_name: 'Example Pastor', role: 'pastor' });
  if (path.endsWith('/rpc/program_directory_current')) return reply(directory);
  if (path.endsWith('/rpc/create_ministry_followup')) {
    const body = route.request().postDataJSON();
    payloads.push(body);
    const mode = nextCreate; nextCreate = 'ok';
    if (mode === 'offline') return route.abort('failed');
    if (mode === 'duplicate') return reply({ code: 'HB001', message: 'An open follow-up already exists for this contact' }, 400);
    requests.push({ id: body.p_id, directory_import_key: body.p_directory_key ?? null, kind: body.p_kind, full_name: body.p_name, phone: body.p_phone, followup_date: body.p_due, assigned_to: body.p_worker, completed_at: null, closure_outcome: null });
    return reply(null);
  }
  if (path.endsWith('/ministry_followup_requests')) {
    if (url.searchParams.has('directory_import_key')) {
      if (linksFail) return reply({ code: '42703', message: 'column does not exist' }, 400);
      return reply(requests.filter(row => row.directory_import_key));
    }
    return reply(requests.filter(row => url.searchParams.get('completed_at') === 'is.null' ? !row.completed_at : !!row.completed_at));
  }
  return reply([]);
});
try {
  await page.goto((process.env.TEST_BASE_URL || 'http://127.0.0.1:3217') + '/admin?view=followup');
  const directorySection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Past program contacts' }) }).last();
  const card = name => directorySection.locator('li').filter({ has: page.getByRole('heading', { name, exact: true }) });
  const prepare = name => card(name).getByRole('button', { name: 'Prepare follow-up' });
  const form = page.locator('#followup-create');
  const nameField = form.getByLabel('Full name', { exact: true });
  const permission = form.getByRole('checkbox');
  const submit = form.getByRole('button', { name: 'Add follow-up', exact: true });
  const notice = form.getByText('Linked to a program directory contact.', { exact: false });
  await card('Example Eligible').waitFor();

  // History and review state decide who can be prepared.
  await expect(card('Example Open')).toContainText(`Follow-up open, next contact ${today}`);
  await expect(card('Example Declined')).toContainText('Asked for no further contact');
  await expect(card('Example Review')).toContainText('Contact details need review');
  for (const name of ['Example Open', 'Example Declined', 'Example Review']) assert.equal(await prepare(name).count(), 0, `${name} must not be preparable`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'phone layout overflows');

  // Remove link: name editable, permission reset, no key sent.
  await prepare('Example Second').click();
  await notice.waitFor();
  assert.equal(await nameField.getAttribute('readonly'), '', 'linked name is read only');
  await permission.check();
  await form.getByRole('button', { name: 'Remove link' }).click();
  assert.equal(await notice.count(), 0);
  assert.equal(await permission.isChecked(), false, 'removing the link resets permission');
  assert.equal(await nameField.getAttribute('readonly'), null);

  // Linked create: consent required; offline save retries with the same identifier.
  await prepare('Example Eligible').click();
  await expect(nameField).toHaveValue('Example Eligible');
  await form.getByLabel('Next contact date', { exact: true }).fill(today);
  await submit.click();
  assert.equal(payloads.length, 0, 'consent required');
  await permission.check();
  nextCreate = 'offline';
  await submit.click();
  await expect(form.getByRole('status')).toContainText('Save not confirmed');
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(card('Example Eligible')).toContainText('Follow-up open');
  assert.equal(payloads.length, 2);
  assert.equal(payloads[0].p_id, payloads[1].p_id, 'retry keeps the request identifier');
  assert.equal(payloads[1].p_directory_key, 'k-eligible');
  assert.equal(requests.filter(row => row.directory_import_key === 'k-eligible').length, 1);
  assert.equal(await prepare('Example Eligible').count(), 0);
  await expect(notice).toHaveCount(0);
  await expect(nameField).toHaveValue('');

  // Database refusal: clear message and a fresh identifier next time.
  await prepare('Example Second').click();
  await form.getByLabel('Next contact date', { exact: true }).fill(today);
  await permission.check();
  nextCreate = 'duplicate';
  await submit.click();
  await expect(form.getByRole('status')).toContainText('already has an open follow-up');
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(card('Example Second')).toContainText('Follow-up open');
  assert.notEqual(payloads[2].p_id, payloads[3].p_id, 'a refused save is not retried under the same identifier');

  // Manual entry never sends a link.
  await nameField.fill('Example Walk In');
  await form.getByLabel('Next contact date', { exact: true }).fill(today);
  await permission.check();
  await submit.click();
  await expect(form.getByRole('status')).toContainText('Follow-up created');
  assert.equal('p_directory_key' in payloads.at(-1), false);

  // Missing history (for example before the migration) leaves the board usable.
  linksFail = true;
  await page.reload();
  await card('Example Open').waitFor();
  await expect(directorySection).toContainText('Follow-up status could not load.');
  await expect(page.getByRole('button', { name: 'Add follow-up', exact: true })).toBeEnabled();
  await page.setViewportSize({ width: 1440, height: 1000 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'desktop layout overflows');

  workspace = 'evangelism'; linksFail = false;
  await page.reload();
  await page.getByRole('heading', { name: 'Visitor & ministry follow-up' }).waitFor();
  await expect(page.getByRole('button', { name: 'Refresh board', exact: true })).toBeEnabled();
  assert.equal(await page.getByRole('heading', { name: 'Past program contacts' }).count(), 0);
  console.log('PASS: link status, remove link, consent, offline retry, database refusal, manual entry, missing history, worker view, layouts');
} finally { await browser.close(); }
