import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isZoomInvitation } from '../src/lib/liveMeeting.ts';

test('accepts complete official Zoom invitations', () => {
  assert.equal(isZoomInvitation('https://us06web.zoom.us/j/1234567890?pwd=example.1'), true);
  assert.equal(isZoomInvitation('https://zoom.us/j/1234567890?pwd=example'), true);
});
test('rejects unsafe or incomplete redirect destinations', () => {
  for (const url of [null, undefined, '', 'javascript:alert(1)',
    'https://zoom.us.attacker.example/j/123?pwd=example',
    'https://attacker.example@zoom.us/j/123?pwd=example',
    'http://zoom.us/j/123?pwd=example', 'https://zoom.us/j/123',
    'https://zoom.us/j/123?pwd=example&redirect=https://attacker.example',
    'https://zoom.us/j/123?pwd=example\n',
    'https://zoom.us/j/123?pwd=example\r\nLocation:https://attacker.example']) {
    assert.equal(isZoomInvitation(url), false);
  }
});
