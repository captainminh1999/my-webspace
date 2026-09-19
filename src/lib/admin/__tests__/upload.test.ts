// The upload moved from a Netlify function into src/lib/admin. These tests hold the new planner to the OLD
// function's behaviour: fixtures/<section>.writes.json is every Mongo call the old function made for
// fixtures/<section>.csv, recorded by running it with Mongo faked (design-auth.md §8). The old function is
// deleted, so the goldens can no longer be re-captured: a new fixture needs its writes checked by hand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import type { Db } from 'mongodb';
import { applyWrites, planUpload, type CvWrite } from '../cvUpload.ts';
import { CV_SECTIONS, isCvSection, isSingletonSection } from '../sections.ts';
import { relyingParty } from '../rp.ts';
import * as h from '../handlers.ts';
import { csvBase64, enrol, SKILLS_UPLOAD, world } from './client.ts';
import { SoftAuthenticator } from './softAuthenticator.ts';

// A fixture is <section>.csv or <section>.<variant>.csv. The seven plain ones came with the design; the variants,
// licenses and projects were captured the same way to pin the old function's odd corners: an ISO date that
// becomes {}, a row with a field too many, an About of two rows, a profile without websites, an emptied list.
const FIXTURES = new URL('./fixtures/', import.meta.url);
const fixtures = readdirSync(FIXTURES).filter((f) => f.endsWith('.csv')).map((f) => f.replace(/\.csv$/, '')).sort();
const sectionOf = (fixture: string) => fixture.split('.')[0];
const base64Of = (fixture: string) => readFileSync(new URL(`${fixture}.csv`, FIXTURES)).toString('base64');
const goldenOf = (fixture: string) => JSON.parse(readFileSync(new URL(`${fixture}.writes.json`, FIXTURES), 'utf-8')) as { status: number; message: string; writes: CvWrite[] };
// JSON drops `undefined`, the driver stores it as null: a lost or gained `undefined` is a behaviour change, so it stays visible.
const exact = (value: unknown) => JSON.stringify(value, (_key, x) => (x === undefined ? '__undefined__' : x), 2);

test('the goldens are all here', () => {
  assert.deepEqual(fixtures, ['about', 'about.alt', 'education', 'experience', 'experience.alt', 'languages', 'licenses', 'profile', 'profile.alt', 'projects', 'skills', 'volunteering']);
  assert.ok(fixtures.map(sectionOf).every(isCvSection));
});

for (const fixture of fixtures) {
  test(`planUpload: ${fixture}.csv plans exactly the writes the old function made`, () => {
    const golden = goldenOf(fixture);
    assert.equal(golden.status, 200);
    const plan = planUpload(sectionOf(fixture), base64Of(fixture));
    assert.ok(plan.ok);
    assert.equal(exact({ status: 200, message: plan.message, writes: plan.writes }), exact(golden));
  });
}

test('the experience golden really carries an undefined — the comparison would notice it going missing', () => {
  assert.ok(exact(goldenOf('experience')).includes('"endDate": "__undefined__"'));
  const plan = planUpload('experience', base64Of('experience'));
  assert.ok(plan.ok && plan.writes[1].op === 'insertMany');
  const roles = (plan.writes[1].docs[1] as { roles: Record<string, unknown>[] }).roles;
  assert.ok('endDate' in roles[1] && roles[1].endDate === undefined);
});

test('applyWrites hands the driver the same calls, in the same order', async () => {
  for (const fixture of fixtures) {
    const calls: unknown[] = [];
    const collection = (coll: string) => ({
      updateOne: async (filter: unknown, update: unknown, options: unknown) => { calls.push({ coll, op: 'updateOne', filter, update, options }); },
      replaceOne: async (filter: unknown, doc: unknown, options: unknown) => { calls.push({ coll, op: 'replaceOne', filter, doc, options }); },
      deleteMany: async (filter: unknown) => { calls.push({ coll, op: 'deleteMany', filter }); },
      insertMany: async (docs: unknown) => { calls.push({ coll, op: 'insertMany', docs }); },
    });
    const plan = planUpload(sectionOf(fixture), base64Of(fixture));
    assert.ok(plan.ok);
    await applyWrites({ collection } as unknown as Db, plan.writes);
    assert.equal(exact(calls), exact(goldenOf(fixture).writes), fixture);
  }
});

test('a list section with no rows is emptied and nothing is inserted; an empty profile is refused (the old function said 500, the design says 400)', () => {
  const emptied = planUpload('projects', base64Of('projects'));
  assert.deepEqual(emptied.ok && emptied.writes, [{ coll: 'projects', op: 'deleteMany', filter: {} }]);
  assert.deepEqual(planUpload('profile', csvBase64('First Name,Last Name\n')), { ok: false, status: 400, message: 'Profile CSV is empty or invalid.' });
});

test('only the twelve CV sections are collections an upload may name', () => {
  assert.equal(CV_SECTIONS.length, 12);
  assert.deepEqual(CV_SECTIONS.map((s) => s.id).filter(isSingletonSection), ['profile', 'about']);
  for (const name of ['admin_credentials', 'admin_sessions', 'admin_challenges', 'singletons', 'widgets', '', 'Profile', '__proto__', 'constructor']) {
    assert.deepEqual(planUpload(name, base64Of('skills')), { ok: false, status: 400, message: 'Bad Request: Invalid section identifier.' }, name);
  }
});

for (const rp of [relyingParty('production'), relyingParty('development')]) {
  test(`[${rp.rpID}] signed in: sectionIdentifier "admin_credentials" is a 400 and the database is never called`, async () => {
    const w = world(rp);
    assert.equal((await enrol(w.client, new SoftAuthenticator())).status, 200);
    const credentialsBefore = exact([...w.store.credentials.values()]);

    const refused = await w.client.post(h.upload, { sectionIdentifier: 'admin_credentials', fileName: 'x.csv', fileContentBase64: base64Of('skills') });
    assert.equal(refused.status, 400);
    assert.deepEqual(refused.body, { message: 'Bad Request: Invalid section identifier.' });
    assert.equal((await w.client.post(h.upload, { fileName: 'x.csv', fileContentBase64: base64Of('skills') })).status, 400, 'no section at all');
    // The old function refused a missing file; read as "" it would plan "delete everything, insert nothing".
    const noFile = await w.client.post(h.upload, { sectionIdentifier: 'skills', fileName: 'x.csv' });
    assert.equal(noFile.status, 400);
    assert.deepEqual(noFile.body, { message: 'Bad Request: Invalid file content encoding.' });
    assert.equal((await w.client.post(h.upload, { sectionIdentifier: 'skills', fileContentBase64: 42 })).status, 400);
    // Valid JSON that String() cannot convert: a bad request, not a 503 with a TypeError in the log.
    for (const hostile of [{ toString: 1 }, { valueOf: null, toString: null }, ['skills']]) {
      assert.equal((await w.client.post(h.upload, { sectionIdentifier: hostile, fileContentBase64: base64Of('skills') })).status, 400, JSON.stringify(hostile));
      assert.equal((await w.client.post(h.upload, { sectionIdentifier: 'nowhere', fileContentBase64: hostile })).status, 400, JSON.stringify(hostile));
      assert.equal((await w.client.post(h.upload, { sectionIdentifier: 'skills', fileContentBase64: hostile })).status, 400, JSON.stringify(hostile));
    }

    assert.deepEqual(w.applied, [], 'cv.apply was never called');
    assert.deepEqual(w.revalidated, []);
    assert.equal(exact([...w.store.credentials.values()]), credentialsBefore);
  });

  test(`[${rp.rpID}] signed in: an upload applies the plan, then revalidates; a database error is a 500 without the driver's words`, async () => {
    const w = world(rp);
    await enrol(w.client, new SoftAuthenticator());
    const ok = await w.client.post(h.upload, { sectionIdentifier: 'profile', fileName: 'Profile.csv', fileContentBase64: base64Of('profile') });
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.body, { message: goldenOf('profile').message });
    assert.equal(exact(w.applied), exact([goldenOf('profile').writes]));
    assert.deepEqual(w.revalidated, ['profile']);

    w.deps.cv.apply = async () => { throw new Error('connection 7 to 203.0.113.9:27017 closed'); };
    const errors: unknown[][] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => { errors.push(args); };
    try {
      const failed = await w.client.post(h.upload, SKILLS_UPLOAD);
      assert.equal(failed.status, 500);
      assert.deepEqual(failed.body, { message: 'Database error' });
    } finally { console.error = original; }
    assert.equal(errors.length, 1, 'the reason goes to the log');
    assert.deepEqual(w.revalidated, ['profile'], 'nothing is revalidated after a failed write');
  });
}
