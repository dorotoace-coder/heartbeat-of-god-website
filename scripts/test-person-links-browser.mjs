// Person linking with a fully mocked backend and fictional people.
// Build with NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co, serve on
// 127.0.0.1:3217, then run this file. Any other network host is blocked.
import assert from 'node:assert/strict';
const { chromium, expect } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
page.setDefaultTimeout(10000);
const uid = '00000000-0000-4000-8000-000000000001';
const contact = (key, name) => ({ import_key: key, display_name: name, email: `${key}@example.test`, phone_original: '+1 204 555 0100',
  programs: ['MTA'], review_flags: [], relationship: 'unconfirmed', attendance: 'unknown', worker_match: false, member_match: false, worker_departments: [], review_reasons: [] });
const directory = [contact('k-ada', 'Example Ada'), contact('k-ben', 'Example Ben')];
const people = [{ id: 'p-staff', full_name: 'Example Staff Person', phone: null, address: null, social_contact: null, requests_school: false, origin: 'staff' }];
const links = [];
let nextLink = 'ok';
const calls = [];
const token = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url'), 'test-only'].join('.');
await context.addInitScript(({ uid, token }) => localStorage.setItem('sb-placeholder-auth-token', JSON.stringify({ access_token: token, refresh_token: 'synthetic-only', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'test@example.com' } })), { uid, token });
await page.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.hostname === '127.0.0.1') return route.continue();
  if (url.hostname !== 'placeholder.supabase.co') return route.abort();
  const path = url.pathname;
  const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (path === '/auth/v1/user') return reply({ id: uid, aud: 'authenticated', role: 'authenticated', email: 'test@example.com' });
  if (path.endsWith('/rpc/staff_workspace')) return reply('pastor');
  if (path.endsWith('/profiles')) return reply({ full_name: 'Example Pastor', role: 'owner' });
  if (path.endsWith('/rpc/program_directory_current')) return reply(directory);
  if (path.endsWith('/rpc/person_candidates')) {
    const { p_source_key } = route.request().postDataJSON();
    return reply(p_source_key === 'k-ben' ? [{ person_id: 'p-staff', full_name: 'Example Staff Person', reasons: ['same_phone'], active_links: 0 }] : []);
  }
  if (path.endsWith('/rpc/person_link')) {
    const body = route.request().postDataJSON(); calls.push(['link', body]);
    const mode = nextLink; nextLink = 'ok';
    if (mode === 'offline') return route.abort('failed');
    if (mode === 'taken') return reply({ code: 'HB011', message: 'This contact is already linked' }, 400);
    let person = body.p_person;
    if (!person) { person = `p-${body.p_source_key}`; people.push({ id: person, full_name: directory.find(c => c.import_key === body.p_source_key).display_name, phone: null, address: null, social_contact: null, requests_school: false, origin: 'program_directory' }); }
    links.push({ id: body.p_link, person_id: person, source_key: body.p_source_key, active: true });
    return reply(person);
  }
  if (path.endsWith('/rpc/person_unlink')) {
    const body = route.request().postDataJSON(); calls.push(['unlink', body]);
    links.find(link => link.id === body.p_link).active = false;
    return reply(null);
  }
  if (path.endsWith('/person_source_links')) return reply(links.filter(link => link.active).map(({ id, person_id, source_key }) => ({ id, person_id, source_key })));
  if (path.endsWith('/congregation_people')) {
    const ids = url.searchParams.get('id');
    if (ids) { const wanted = ids.replace(/^in\.\(|\)$/g, '').split(',').map(v => v.replace(/"/g, '')); return reply(people.filter(p => wanted.includes(p.id)).map(({ id, full_name }) => ({ id, full_name }))); }
    return reply(people);
  }
  if (path.endsWith('/foundation_classes')) return reply([{ id: 'class-1', title: 'Example Class', starts_on: '2026-12-06', teacher_id: 'teacher-1' }]);
  if (path.endsWith('/foundation_teachers')) return reply([{ id: 'teacher-1', full_name: 'Example Teacher' }]);
  return reply([]);
});
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3217';
try {
  await page.goto(base + '/admin?view=followup');
  const directorySection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Past program contacts' }) }).last();
  const card = name => directorySection.locator('li').filter({ has: page.getByRole('heading', { name, exact: true }) });
  await card('Example Ada').waitFor();

  // New person: identity confirmation and evidence are required.
  await card('Example Ada').getByRole('button', { name: 'Link to a person' }).click();
  await expect(card('Example Ada')).toContainText('No existing person shares this email, phone or name.');
  await card('Example Ada').getByRole('radio', { name: /New person/ }).check();
  const save = card('Example Ada').getByRole('button', { name: 'Save link' });
  await expect(save).toBeDisabled();
  await card('Example Ada').getByRole('checkbox', { name: 'Confirmed in person' }).check();
  await expect(save).toBeDisabled();
  await card('Example Ada').getByRole('checkbox', { name: 'I checked this is the same person.' }).check();
  // A lost connection keeps the same request id for the retry.
  nextLink = 'offline';
  await save.click();
  await expect(card('Example Ada').getByRole('alert')).toContainText('Check your connection');
  await save.click();
  await expect(card('Example Ada')).toContainText('Linked to Example Ada');
  const adaCalls = calls.filter(([kind, body]) => kind === 'link' && body.p_source_key === 'k-ada');
  assert.equal(adaCalls.length, 2);
  assert.equal(adaCalls[0][1].p_link, adaCalls[1][1].p_link, 'retry reuses the request id');
  assert.equal(adaCalls[1][1].p_person, null);
  assert.deepEqual(adaCalls[1][1].p_evidence, ['confirmed_in_person']);
  assert.equal(adaCalls[1][1].p_identity_checked, true);

  // Existing person: the suggestion pre-selects its reason as evidence.
  await card('Example Ben').getByRole('button', { name: 'Link to a person' }).click();
  await card('Example Ben').getByRole('radio', { name: /Example Staff Person/ }).check();
  await expect(card('Example Ben').getByRole('checkbox', { name: 'Same phone' })).toBeChecked();
  await card('Example Ben').getByRole('checkbox', { name: 'I checked this is the same person.' }).check();
  nextLink = 'taken';
  await card('Example Ben').getByRole('button', { name: 'Save link' }).click();
  await expect(card('Example Ben').getByRole('alert')).toContainText('linked meanwhile');
  const benCalls = calls.filter(([kind, body]) => kind === 'link' && body.p_source_key === 'k-ben');
  await card('Example Ben').getByRole('button', { name: 'Save link' }).click();
  await expect(card('Example Ben')).toContainText('Linked to Example Staff Person');
  const benAfter = calls.filter(([kind, body]) => kind === 'link' && body.p_source_key === 'k-ben');
  assert.notEqual(benCalls[0][1].p_link, benAfter[1][1].p_link, 'a refused link is not retried under the same id');
  assert.equal(benAfter[1][1].p_person, 'p-staff');

  // Unlink needs a reason and returns the card to unlinked.
  await card('Example Ben').getByRole('button', { name: 'Unlink' }).click();
  await expect(card('Example Ben').getByRole('button', { name: 'Remove link' })).toBeDisabled();
  await card('Example Ben').getByLabel('Why remove this link?').fill('Different person');
  await card('Example Ben').getByRole('button', { name: 'Remove link' }).click();
  await expect(card('Example Ben').getByRole('button', { name: 'Link to a person' })).toBeVisible();
  assert.equal(calls.at(-1)[1].p_reason, 'Different person');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'phone layout overflows');

  // People shows the new person as unconfirmed; the staff person has no badge.
  await page.goto(base + '/admin?view=members');
  await page.getByText('Example Ada', { exact: false }).first().waitFor();
  await expect(page.locator('summary').filter({ hasText: 'Example Ada' })).toContainText('membership unconfirmed');
  await expect(page.locator('summary').filter({ hasText: 'Example Staff Person' })).not.toContainText('membership unconfirmed');

  // The school list leaves out the unconfirmed directory person.
  await page.goto(base + '/admin?view=school');
  const enrol = page.getByLabel('Enroll a person');
  await enrol.waitFor();
  const options = await enrol.locator('option').allTextContents();
  assert.ok(options.some(text => text.includes('Example Staff Person')), 'staff person offered');
  assert.ok(!options.some(text => text.includes('Example Ada')), 'unconfirmed directory person not offered');
  await page.setViewportSize({ width: 1440, height: 1000 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'desktop layout overflows');
  console.log('PASS: new-person link, required confirmation, offline retry, existing-person link, refusal, unlink, People badge, school list, layouts');
} finally { await browser.close(); }
