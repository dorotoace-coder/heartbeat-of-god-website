// Recording email permission on directory cards, with a fully mocked backend and
// fictional people. Build with NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co,
// serve on 127.0.0.1:3217, then run this file. Any other network host is blocked.
import assert from 'node:assert/strict';
const { chromium, expect } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
page.setDefaultTimeout(10000);
const uid = '00000000-0000-4000-8000-000000000001';
const contact = (key, name) => ({ import_key: key, display_name: name, email: `${key}@example.test`, phone_original: '', programs: ['MTA'],
  review_flags: [], relationship: 'unconfirmed', attendance: 'unknown', worker_match: false, member_match: false, worker_departments: [], review_reasons: [] });
const directory = [contact('ada', 'Example Ada'), contact('ben', 'Example Ben')];
const log = [];
const suppressed = new Set(['ben@example.test']);
let mode = 'ok';
const calls = [];
const token = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url'), 'test-only'].join('.');
await context.addInitScript(({ uid, token }) => localStorage.setItem('sb-placeholder-auth-token', JSON.stringify({ access_token: token, refresh_token: 'x', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'test@example.com' } })), { uid, token });
await page.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.hostname === '127.0.0.1') return route.continue();
  if (url.hostname !== 'placeholder.supabase.co') return route.abort();
  const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
  const path = url.pathname;
  if (path === '/auth/v1/user') return reply({ id: uid, aud: 'authenticated', role: 'authenticated', email: 'test@example.com' });
  if (path.endsWith('/rpc/staff_workspace')) return reply('pastor');
  if (path.endsWith('/profiles')) return reply({ full_name: 'Example Pastor', role: 'owner' });
  if (path.endsWith('/rpc/program_directory_current')) return reply(directory);
  if (path.endsWith('/rpc/permission_status')) {
    const { p_addresses } = route.request().postDataJSON();
    return reply(p_addresses.flatMap(address => ['event_invitation', 'ministry_news', 'greetings'].map(purpose => {
      const last = log.filter(item => item.address === address && item.purpose === purpose).at(-1);
      const blocked = suppressed.has(address);
      return { address, purpose, decision: last?.decision ?? null, method: last?.method ?? null, recorded_at: null, suppressed: blocked, allowed: !blocked && last?.decision === 'granted' };
    })));
  }
  if (path.endsWith('/rpc/permission_record')) {
    const body = route.request().postDataJSON(); calls.push(body);
    const current = mode; mode = 'ok';
    if (current === 'offline') return route.abort('failed');
    if (!log.some(item => item.request === body.p_request)) for (const purpose of body.p_purposes) log.push({ request: body.p_request, address: body.p_address, purpose, decision: body.p_decision, method: body.p_method });
    return reply(null);
  }
  return reply([]);
});
try {
  await page.goto((process.env.TEST_BASE_URL || 'http://127.0.0.1:3217') + '/admin?view=followup');
  const card = name => page.locator('section').filter({ has: page.getByRole('heading', { name: 'Past program contacts' }) }).last()
    .locator('li').filter({ has: page.getByRole('heading', { name, exact: true }) });
  const ada = card('Example Ada');
  await expect(ada).toContainText('Event invitations: not asked');
  await expect(ada).toContainText('Greetings and encouragement: not asked');

  // A grant needs purposes, how, what was asked, and the identity check.
  await ada.getByRole('button', { name: 'Record permission' }).click();
  const save = ada.getByRole('button', { name: 'Save', exact: true });
  await expect(save).toBeDisabled();
  await ada.getByRole('checkbox', { name: 'Event invitations' }).check();
  await ada.getByLabel('How they agreed').selectOption('in_person');
  await ada.getByLabel('What you asked them, in your words').fill('May we email you invitations to ministry events?');
  await expect(save).toBeDisabled();
  await ada.getByRole('checkbox', { name: 'I checked this email address belongs to the person who agreed.' }).check();
  mode = 'offline';
  await save.click();
  await expect(ada.getByRole('alert')).toContainText('Check your connection');
  await save.click();
  await expect(ada).toContainText('Event invitations: agreed');
  await expect(ada).toContainText('Ministry news: not asked');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].p_request, calls[1].p_request, 'retry reuses the request id');
  assert.deepEqual(calls[1].p_purposes, ['event_invitation']);
  assert.equal(calls[1].p_decision, 'granted');
  assert.equal(calls[1].p_identity_checked, true);
  assert.equal(calls[1].p_address, 'ada@example.test');

  // Asking to stop needs only the purposes.
  await ada.getByRole('button', { name: 'Record they asked to stop' }).click();
  await ada.getByRole('checkbox', { name: 'Event invitations' }).check();
  await expect(ada.getByLabel('How they agreed')).toHaveCount(0);
  await ada.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(ada).toContainText('Event invitations: asked to stop');
  assert.equal(calls.at(-1).p_method, 'owner_recorded');
  assert.equal(calls.at(-1).p_wording, null);

  // An address on the opt-out list cannot be given new permission here.
  const ben = card('Example Ben');
  await expect(ben).toContainText('blocked (opted out of all ministry email)');
  assert.equal(await ben.getByRole('button', { name: 'Record permission' }).count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'phone layout overflows');
  console.log('PASS: unknown by default, required fields, offline retry, grant, withdrawal, opt-out block, phone layout');
} finally { await browser.close(); }
