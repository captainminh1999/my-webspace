import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upcomingHours } from '../weather.ts';

const H = 3600;
const at = Date.UTC(2026, 9, 13, 0) / 1000; // 13 Oct 2026, 00:00 UTC: the hour the feed ran in
const data = { hourly: Array.from({ length: 15 }, (_, i) => ({ dt: at + i * H, temp: 20 + i, icon: '01d' })) };

test('the hour under way and the ones to come are shown; the hours already gone are not', () => {
  assert.equal(upcomingHours(data, new Date((at + 10 * 60) * 1000))[0].dt, at, 'ten past: the current hour first');
  const later = upcomingHours(data, new Date((at + 2 * H + 50 * 60) * 1000));
  assert.equal(later[0].dt, at + 2 * H, 'nearly three hours on, the run is old but the row starts at the current hour');
  assert.equal(later.length, 12, 'and there are still twelve to show');
});

test('an old reading shows what is left of it, and a missing one shows nothing', () => {
  assert.equal(upcomingHours(data, new Date((at + 10 * H) * 1000)).length, 5);
  assert.deepEqual(upcomingHours(data, new Date((at + 20 * H) * 1000)), []);
  assert.deepEqual(upcomingHours({}, new Date()), []);
});
