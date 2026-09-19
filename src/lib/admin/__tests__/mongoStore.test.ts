// mongoStore against a fake Db: what it asks of the driver, and what it makes of the driver's answers.
// Nothing here connects anywhere — whether Atlas M0 accepts these indexes is settled by the local proof (gate G2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MongoServerError, type Db } from 'mongodb';
import { createMongoStore } from '../mongoStore.ts';
import type { CredentialDoc } from '../store.ts';

interface Call { coll: string; op: string; args: unknown[] }
function fakeDb(answer: (call: Call) => unknown = () => undefined) {
  const calls: Call[] = [];
  const collection = (coll: string) => new Proxy({}, {
    // No `then`: an async function returning this collection would otherwise take it for a promise and wait for ever.
    get: (_target, op) => op === 'then' ? undefined : (...args: unknown[]) => {
      const call = { coll, op: String(op), args };
      calls.push(call);
      if (call.op === 'find') return { sort: () => ({ toArray: async () => [] }) };
      return Promise.resolve().then(() => answer(call));
    },
  });
  const opsOf = (op: string) => calls.filter((c) => c.op === op);
  return { db: { collection } as unknown as Db, calls, opsOf };
}

const NOW = new Date('2026-09-19T00:00:00Z');
const credential = (extra: Partial<CredentialDoc> = {}): CredentialDoc => ({
  _id: 'cred-1', rpId: 'nhatminh.dev', publicKey: 'a2V5', counter: 0, transports: ['internal'], deviceType: 'multiDevice', backedUp: true,
  aaguid: '00000000-0000-0000-0000-000000000000', label: 'Synced passkey', createdAt: NOW, lastUsedAt: null, ...extra,
});
const session = { _id: 'f'.repeat(64), rpId: 'nhatminh.dev', credentialId: 'cred-1', createdAt: NOW, expiresAt: new Date(+NOW + 1000) };

test('the three indexes: asked for once, before the first write, never for a read', async () => {
  const fake = fakeDb();
  const store = createMongoStore(async () => fake.db);
  await store.findSession('x');
  await store.countCredentials('nhatminh.dev');
  await store.listCredentials('nhatminh.dev');
  assert.deepEqual(fake.opsOf('createIndex'), [], 'reads do not wait for indexes');

  await store.saveSession(session);
  assert.deepEqual(fake.opsOf('createIndex').map((c) => [c.coll, ...c.args]), [
    ['admin_credentials', { rpId: 1, bootstrap: 1 }, { unique: true, partialFilterExpression: { bootstrap: true }, name: 'one_bootstrap_per_rp' }],
    ['admin_sessions', { expiresAt: 1 }, { expireAfterSeconds: 0 }],
    ['admin_challenges', { expiresAt: 1 }, { expireAfterSeconds: 0 }],
  ]);
  assert.equal(fake.calls.findIndex((c) => c.op === 'insertOne') > fake.calls.findIndex((c) => c.op === 'createIndex' && c.coll === 'admin_challenges'), true, 'awaited before the write');

  await Promise.all([store.insertCredential(credential()), store.saveChallenge({ _id: 'c', kind: 'authentication', rpId: 'nhatminh.dev', createdAt: NOW, expiresAt: NOW }), store.deleteSession('x')]);
  assert.equal(fake.opsOf('createIndex').length, 3, 'once per warm process');
});

test('a failed createIndex fails the write and clears the memo: the next write asks again', async () => {
  let outage = true;
  const fake = fakeDb((call) => { if (call.op === 'createIndex' && call.coll === 'admin_sessions' && outage) throw new Error('not primary'); });
  const store = createMongoStore(async () => fake.db);
  await assert.rejects(store.saveSession(session), /not primary/);
  assert.deepEqual(fake.opsOf('insertOne'), [], 'nothing is written without the indexes');
  outage = false;
  await store.saveSession(session);
  assert.equal(fake.opsOf('createIndex').length, 6);
  assert.equal(fake.opsOf('insertOne').length, 1);
});

test('insertCredential: E11000 on the bootstrap index is "locked", on _id it is "duplicate", anything else is thrown', async () => {
  const refusing = (error: unknown) => createMongoStore(async () => fakeDb((call) => { if (call.op === 'insertOne') throw error; }).db);
  const e11000 = (extra: Record<string, unknown>) => new MongoServerError({ code: 11000, ...extra });

  assert.equal(await createMongoStore(async () => fakeDb().db).insertCredential(credential({ bootstrap: true })), 'ok');
  // MongoDB 8 names the index that refused the insert in keyPattern; the message names it as well.
  assert.equal(await refusing(e11000({ message: 'E11000 duplicate key error', keyPattern: { rpId: 1, bootstrap: 1 }, keyValue: { rpId: 'nhatminh.dev', bootstrap: true } })).insertCredential(credential({ bootstrap: true })), 'locked');
  assert.equal(await refusing(e11000({ message: 'E11000 duplicate key error collection: cv.admin_credentials index: one_bootstrap_per_rp dup key: { rpId: "nhatminh.dev", bootstrap: true }' })).insertCredential(credential({ bootstrap: true })), 'locked');
  assert.equal(await refusing(e11000({ message: 'E11000 duplicate key error collection: cv.admin_credentials index: _id_ dup key: { _id: "cred-1" }', keyPattern: { _id: 1 } })).insertCredential(credential()), 'duplicate');
  await assert.rejects(refusing(new MongoServerError({ message: 'not authorized on cv to execute command', code: 13 })).insertCredential(credential()), /not authorized/);
  await assert.rejects(refusing(new Error('server selection timed out')).insertCredential(credential()), /timed out/);
});

test('every lookup is per rpId; a challenge is taken with findOneAndDelete; the cap counts live sign-in challenges with a limit', async () => {
  const fake = fakeDb((call) => (call.op === 'countDocuments' ? 7 : call.op === 'findOneAndDelete' ? { _id: 'ch' } : null));
  const store = createMongoStore(async () => fake.db);

  assert.equal(await store.findCredential('localhost', 'cred-1'), null);
  assert.deepEqual(fake.calls.at(-1), { coll: 'admin_credentials', op: 'findOne', args: [{ _id: 'cred-1', rpId: 'localhost' }] });
  assert.equal(await store.countLoginChallenges('localhost', NOW, 5001), 7);
  assert.deepEqual(fake.calls.at(-1), { coll: 'admin_challenges', op: 'countDocuments', args: [{ rpId: 'localhost', kind: 'authentication', expiresAt: { $gt: NOW } }, { limit: 5001 }] });
  assert.deepEqual(await store.takeChallenge('localhost', 'registration', 'ch'), { _id: 'ch' });
  assert.deepEqual(fake.calls.at(-1), { coll: 'admin_challenges', op: 'findOneAndDelete', args: [{ _id: 'ch', kind: 'registration', rpId: 'localhost' }] });
  await store.recordUse('localhost', 'cred-1', { counter: 4, backedUp: false, lastUsedAt: NOW });
  assert.deepEqual(fake.calls.at(-1), { coll: 'admin_credentials', op: 'updateOne', args: [{ _id: 'cred-1', rpId: 'localhost' }, { $set: { counter: 4, backedUp: false, lastUsedAt: NOW } }] });
  await store.deleteSession('abc');
  assert.deepEqual(fake.calls.at(-1), { coll: 'admin_sessions', op: 'deleteOne', args: [{ _id: 'abc' }] });
});

test('an id that is not a string never reaches the driver: in a filter Mongo would read it as an operator expression', async () => {
  const fake = fakeDb((call) => (call.op === 'findOneAndDelete' || call.op === 'findOne' ? { _id: 'somebody else’s document' } : undefined));
  const store = createMongoStore(async () => fake.db);
  for (const hostile of [{ $gt: '' }, { $ne: null }, { $regex: '.*' }, ['ch'], null, undefined, 42, true]) {
    const id = hostile as unknown as string; // what a JSON body can carry where the types say string
    assert.equal(await store.takeChallenge('nhatminh.dev', 'registration', id), null);
    assert.equal(await store.findCredential('nhatminh.dev', id), null);
    assert.equal(await store.findSession(id), null);
    await store.deleteSession(id);
    await store.recordUse('nhatminh.dev', id, { counter: 1, backedUp: true, lastUsedAt: NOW });
  }
  assert.deepEqual(fake.calls, [], 'not one call, not even for the indexes');
  assert.deepEqual(await store.takeChallenge('nhatminh.dev', 'registration', 'ch'), { _id: 'somebody else’s document' }, 'a string is looked up as before');
});
