import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ownerUserId, relyingParty } from '../rp.ts';

test("only the literal 'development' is the localhost relying party — everything else fails closed to production", () => {
  assert.equal(relyingParty('development').rpID, 'localhost');
  for (const value of ['production', 'test', undefined, '', 'Development', 'development ']) {
    assert.equal(relyingParty(value).rpID, 'nhatminh.dev', JSON.stringify(value));
  }
  // Under `node --test` nothing replaces process.env.NODE_ENV (it is unset), and the default still lands on production.
  if (process.env.NODE_ENV !== 'development') assert.equal(relyingParty().rpID, 'nhatminh.dev');
});

test('production is the apex over https with Secure cookies; local is http://localhost on the three dev ports', () => {
  assert.deepEqual(relyingParty('production'), { rpID: 'nhatminh.dev', rpName: 'nhatminh.dev admin', origins: ['https://nhatminh.dev'], secureCookies: true });
  const local = relyingParty('development');
  assert.deepEqual(local.origins, ['http://localhost:3001', 'http://localhost:3000', 'http://localhost:8888']);
  assert.equal(local.secureCookies, false);
  // 127.0.0.1 is not localhost to WebAuthn, so it must not be an accepted origin either.
  assert.ok(local.origins.every((o) => new URL(o).hostname === 'localhost'));
});

test('one constant WebAuthn user per relying party: no personal data, not shaped like an e-mail address', () => {
  const prod = ownerUserId(relyingParty('production'));
  const local = ownerUserId(relyingParty('development'));
  assert.ok(prod instanceof Uint8Array);
  assert.equal(Buffer.from(prod).toString(), 'owner:nhatminh.dev');
  assert.equal(Buffer.from(local).toString(), 'owner:localhost');
  assert.deepEqual(ownerUserId(relyingParty('production')), prod, 'stable, so enrolling again overwrites the provider entry');
  assert.ok(!Buffer.from(prod).toString().includes('@'));
});
