// Inquiry status saving with a fully mocked backend and fictional people.
// Build with NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co, serve on
// 127.0.0.1:3217, then run this file. Any other network host is blocked.
import assert from 'node:assert/strict';
const { chromium, expect } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
page.setDefaultTimeout(10000);
const uid = '00000000-0000-4000-8000-000000000001';
const rows = [
  { id: 'inq-1', created_at: '2026-11-20T10:00:00Z', full_name: 'Example Prayer', email: 'prayer@example.test', type: 'Prayer Request', message: 'Synthetic', status: 'pending', phone: null, category: null, confidential: false, area: null, visit_type: null, invited_by: null, prayer_need: null },
  { id: 'inq-2', created_at: '2026-11-19T10:00:00Z', full_name: 'Example Conference', email: 'conf@example.test', type: 'ilpc_2026_registration', message: '{}', status: 'new', phone: null, category: null, confidential: false, area: null, visit_type: null, invited_by: null, prayer_need: null },
];
let mode = 'ok';
const patches = [];
const token = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url'), 'test-only'].join('.');
await context.addInitScript(({ uid, token }) => localStorage.setItem('sb-placeholder-auth-token', JSON.stringify({ access_token: token, refresh_token: 'synthetic-only', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'test@example.com' } })), { uid, token });
await page.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.hostname === '127.0.0.1') return route.continue();
  if (url.hostname !== 'placeholder.supabase.co') return route.abort();
  const path = url.pathname, method = route.request().method();
  const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (path === '/auth/v1/user') return reply({ id: uid, aud: 'authenticated', role: 'authenticated', email: 'test@example.com' });
  if (path.endsWith('/rpc/staff_workspace')) return reply('pastor');
  if (path.endsWith('/profiles')) return reply({ full_name: 'Example Pastor', role: 'owner' });
  if (path.endsWith('/inquiries') && method === 'PATCH') {
    const id = url.searchParams.get('id').replace('eq.', '');
    const body = route.request().postDataJSON();
    patches.push({ id, ...body, select: url.searchParams.get('select') });
    const current = mode; mode = 'ok';
    if (current === 'offline') return route.abort('failed');
    if (current === 'refused') return reply([]);
    if (current === 'forbidden') return reply({ code: '42501', message: 'permission denied for table inquiries' }, 403);
    const row = rows.find(item => item.id === id); row.status = body.status;
    return reply([{ id, status: body.status }]);
  }
  if (path.endsWith('/inquiries')) return reply(rows);
  return reply([]);
});
try {
  await page.goto((process.env.TEST_BASE_URL || 'http://127.0.0.1:3217') + '/admin?view=inquiries');
  await page.getByRole('heading', { name: 'Intake Inbox' }).waitFor();
  const status = name => page.getByLabel(`Status for ${name}`);
  const saveAlert = () => page.getByRole('alert').filter({ hasText: 'Status not saved' });
  await expect(status('Example Prayer')).toHaveValue('pending');
  await expect(status('Example Conference')).toHaveValue('new');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'phone layout overflows');

  // A confirmed save keeps the new status and asks for the row back.
  await status('Example Prayer').selectOption('reviewed');
  await expect(status('Example Prayer')).toBeEnabled();
  await expect(status('Example Prayer')).toHaveValue('reviewed');
  assert.equal(patches.at(-1).status, 'reviewed');
  assert.equal(patches.at(-1).select, 'id,status');
  assert.equal(await saveAlert().count(), 0);

  // The bug: no error, no row. Restore and explain.
  mode = 'refused';
  await status('Example Prayer').selectOption('contacted');
  await expect(saveAlert()).toContainText('may not have permission');
  await expect(status('Example Prayer')).toHaveValue('reviewed');

  // Access refused and connection lost each restore with their own message.
  mode = 'forbidden';
  await status('Example Prayer').selectOption('pending');
  await expect(saveAlert()).toContainText('Check your access');
  await expect(status('Example Prayer')).toHaveValue('reviewed');
  mode = 'offline';
  await status('Example Prayer').selectOption('pending');
  await expect(saveAlert()).toContainText('Check your connection');
  await expect(status('Example Prayer')).toHaveValue('reviewed');

  // A later success clears the message; an unlisted status can be moved on.
  await status('Example Prayer').selectOption('contacted');
  await expect(status('Example Prayer')).toHaveValue('contacted');
  await expect(saveAlert()).toHaveCount(0);
  await status('Example Conference').selectOption('reviewed');
  await expect(status('Example Conference')).toHaveValue('reviewed');

  // Reload shows what was stored.
  await page.reload();
  await expect(status('Example Prayer')).toHaveValue('contacted');
  await expect(status('Example Conference')).toHaveValue('reviewed');
  await page.setViewportSize({ width: 1440, height: 1000 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'desktop layout overflows');
  console.log('PASS: confirmed save, refused update restored, access and connection errors, unlisted status, reload, layouts');
} finally { await browser.close(); }
