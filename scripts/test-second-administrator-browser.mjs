// Second administrator and Pastorate entry, with a fully mocked backend and fictional
// people. Build with NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co, serve on
// 127.0.0.1:3217, then run this file. Any other network host is blocked.
import assert from 'node:assert/strict';
const { chromium, expect } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3217';

async function session({ workspace, role, seat, assignment }) {
  const uid = '00000000-0000-4000-8000-000000000001';
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const token = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url'), 'test-only'].join('.');
  await context.addInitScript(({ uid, token }) => localStorage.setItem('sb-placeholder-auth-token', JSON.stringify({ access_token: token, refresh_token: 'x', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'person@example.test' } })), { uid, token });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    if (url.hostname !== 'placeholder.supabase.co') return route.abort();
    const reply = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    const path = url.pathname;
    if (path === '/auth/v1/user') return reply({ id: uid, aud: 'authenticated', role: 'authenticated', email: 'person@example.test' });
    if (path.endsWith('/rpc/staff_workspace')) return reply(workspace);
    if (path.endsWith('/profiles')) return reply({ full_name: 'Example', role });
    if (path.endsWith('/treasury_portal_access')) return reply(seat ? [{ office: 'pastor' }] : []);
    if (path.endsWith('/pastorate_assignments')) return reply(assignment ? [{ user_id: uid }] : []);
    if (path.endsWith('/rpc/can_use_media_vault')) return reply(true);
    return reply([]);
  });
  return { context, page };
}
const menu = page => page.getByRole('navigation', { name: 'Pastor workspaces' });

try {
  // The Pastor with the Treasury seat keeps Treasury.
  let { context, page } = await session({ workspace: 'pastor', role: 'owner', seat: true });
  await page.goto(base + '/admin');
  await expect(menu(page).getByRole('link', { name: 'Treasury' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Treasury', exact: true }).first()).toBeVisible();
  await context.close();

  // A second administrator opens the same workspace without any Treasury entry.
  ({ context, page } = await session({ workspace: 'pastor', role: 'owner', seat: false }));
  await page.goto(base + '/admin');
  await expect(menu(page).getByRole('link', { name: 'People' })).toBeVisible();
  await expect(menu(page).getByRole('link', { name: 'Pastorate' })).toBeVisible();
  await expect(menu(page).getByRole('link', { name: 'Treasury' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Staff invitations' })).toBeVisible();
  assert.equal(await page.getByRole('heading', { name: 'Treasury', exact: true }).count(), 0, 'Treasury card hidden on Overview');
  assert.equal(await page.getByText('Collections to confirm').count(), 0);
  await page.goto(base + '/admin?view=treasury');
  await expect(page.getByText('Treasury is limited to the Pastor and the Treasury Leader.')).toBeVisible();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'phone layout overflows');
  await context.close();

  // A Media worker with a pastoral assignment can find it; one without cannot.
  ({ context, page } = await session({ workspace: 'media', role: 'leader', seat: false, assignment: true }));
  await page.goto(base + '/admin');
  const link = page.getByRole('link', { name: 'My pastoral assignment' });
  await expect(link).toBeVisible();
  assert.equal(await link.getAttribute('href'), '/admin?view=pastorate');
  await link.click();
  await expect(page.getByRole('heading', { name: 'Pastorate' })).toBeVisible();
  await context.close();
  ({ context, page } = await session({ workspace: 'media', role: 'leader', seat: false, assignment: false }));
  await page.goto(base + '/admin');
  await page.getByRole('link', { name: 'Open training' }).waitFor();
  assert.equal(await page.getByRole('link', { name: 'My pastoral assignment' }).count(), 0);
  await context.close();
  console.log('PASS: Pastor keeps Treasury, second administrator without Treasury, Treasury view blocked, Pastorate link for assigned workers only');
} finally { await browser.close(); }
