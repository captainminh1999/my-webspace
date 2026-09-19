// The admin sign-in end to end, without a browser: the real handlers and the REAL @simplewebauthn/server
// verification, driven by a software passkey, an in-memory store and a clock the test moves by hand.
// Every flow runs under BOTH relying parties — production's constants never meet a real browser before the
// deploy, so this is where they are exercised. The numbers follow the nine groups of design-auth.md §8.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relyingParty, type RelyingParty } from '../rp.ts';
import { cleanLabel, ENROLMENT_DISABLED, hashToken, sessionCookieName } from '../http.ts';
import * as h from '../handlers.ts';
import { hostHint, summary, viewFor } from '../view.ts';
import { Client, enrol, signIn, SECRET, SKILLS_UPLOAD, world, type CreationOptions, type Handler, type RequestOptions } from './client.ts';
import { MemoryStore } from './memoryStore.ts';
import { SoftAuthenticator } from './softAuthenticator.ts';

// The handlers log every refusal, with the library's reason. Kept out of the test output, and checked in group 4.
const logged: string[] = [];
console.error = (...args: unknown[]) => { logged.push(args.map(String).join(' ')); };

const RPS = [relyingParty('production'), relyingParty('development')];
const otherThan = (rp: RelyingParty) => RPS.find((r) => r.rpID !== rp.rpID) as RelyingParty;
const HOURS = 3_600_000, MINUTES = 60_000;
const ALL: [string, Handler][] = [['register/options', h.registerOptions], ['register/verify', h.registerVerify], ['login/options', h.loginOptions], ['login/verify', h.loginVerify], ['logout', h.logout], ['upload', h.upload]];
const creation = (body: Record<string, unknown>) => body as unknown as CreationOptions;
const request = (body: Record<string, unknown>) => body as unknown as RequestOptions;

for (const rp of RPS) {
  const origin = rp.origins[0];
  const other = otherThan(rp);

  test(`[${rp.rpID}] 1. enrol with the secret → upload → logout → replayed cookie refused → sign in → upload → second passkey → sign in with it`, async () => {
    const w = world(rp), c = w.client;
    const first = new SoftAuthenticator();

    const enrolled = await enrol(c, first, { label: '  Mac\tBook  ' });
    assert.equal(enrolled.status, 200);
    assert.deepEqual(enrolled.body, { verified: true });
    assert.ok(c.cookie, 'the first enrolment signs the owner in');
    const [stored] = [...w.store.credentials.values()];
    assert.deepEqual(
      { ...stored, _id: typeof stored._id, publicKey: typeof stored.publicKey },
      { _id: 'string', rpId: rp.rpID, publicKey: 'string', counter: 0, transports: ['internal', 'hybrid'], deviceType: 'multiDevice', backedUp: true,
        aaguid: '00000000-0000-0000-0000-000000000000', label: 'MacBook', bootstrap: true, createdAt: w.deps.now(), lastUsedAt: null },
    );

    const uploaded = await c.post(h.upload, SKILLS_UPLOAD);
    assert.equal(uploaded.status, 200);
    assert.deepEqual(uploaded.body, { message: "Successfully processed CSV for section 'skills' and stored to MongoDB." });
    assert.deepEqual(w.applied, [[{ coll: 'skills', op: 'deleteMany', filter: {} }, { coll: 'skills', op: 'insertMany', docs: [{ value: 'TypeScript' }, { value: 'MongoDB' }] }]]);
    assert.deepEqual(w.revalidated, ['skills']);

    const stolen = c.cookie;
    assert.deepEqual((await c.post(h.logout, {})).body, { signedOut: true });
    assert.equal(c.cookie, '');
    assert.equal(w.store.sessions.size, 0, 'the session document is gone, not just the cookie');
    c.cookie = stolen;
    const replayed = await c.post(h.upload, SKILLS_UPLOAD);
    assert.equal(replayed.status, 401);
    assert.deepEqual(replayed.body, { message: 'Not signed in.' });
    assert.equal((await c.post(h.logout, {})).status, 200, 'logout is idempotent');

    w.clock.t += 5 * MINUTES;
    assert.equal((await signIn(c, first)).status, 200);
    assert.deepEqual(stored.lastUsedAt, w.deps.now());
    assert.equal((await c.post(h.upload, SKILLS_UPLOAD)).status, 200);

    // Add another passkey: no secret, the session authorises it, and the browser is told which passkey exists already.
    const options = await c.post(h.registerOptions, {});
    assert.equal(options.status, 200);
    assert.deepEqual(options.body.excludeCredentials, [{ id: stored._id, type: 'public-key', transports: ['internal', 'hybrid'] }]);
    assert.deepEqual(options.body.authenticatorSelection, { residentKey: 'required', userVerification: 'required', requireResidentKey: true });
    assert.deepEqual(options.body.pubKeyCredParams, [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }]);
    const second = new SoftAuthenticator({ synced: false });
    const added = await c.post(h.registerVerify, { response: second.create(creation(options.body), origin) });
    assert.equal(added.status, 200);
    assert.deepEqual(added.setCookie, [], 'only the first enrolment opens a session');
    const secondDoc = [...w.store.credentials.values()][1];
    assert.deepEqual([secondDoc.bootstrap, secondDoc.label, secondDoc.deviceType, secondDoc.backedUp, secondDoc.counter], [undefined, 'Device passkey', 'singleDevice', false, 1]);

    await c.post(h.logout, {});
    assert.equal((await signIn(c, second)).status, 200);
    assert.equal(secondDoc.counter, 2, 'a device-bound counter is recorded');
    assert.equal((await signIn(c, second)).status, 200);
    assert.equal((await c.post(h.upload, SKILLS_UPLOAD)).status, 200);
    assert.equal(w.applied.length, 3);
  });

  test(`[${rp.rpID}] 2. cookie attributes, and what every answer carries`, async () => {
    const w = world(rp), c = w.client;
    const enrolled = await enrol(c, new SoftAuthenticator());
    assert.equal(enrolled.setCookie.length, 1);
    assert.match(enrolled.setCookie[0], rp.secureCookies
      ? /^__Host-admin_session=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Strict; Max-Age=43200; Secure$/
      : /^admin_session=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Strict; Max-Age=43200$/);
    // The database holds the hash, never the token: reading admin_sessions does not sign anyone in.
    assert.deepEqual([...w.store.sessions.keys()], [hashToken(String(c.token))]);
    assert.match([...w.store.sessions.keys()][0], /^[0-9a-f]{64}$/);

    const out = await c.post(h.logout, {});
    assert.deepEqual(out.setCookie, [`${sessionCookieName(rp)}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${rp.secureCookies ? '; Secure' : ''}`]);

    for (const reply of [enrolled, out, await c.post(h.loginOptions, {}), await c.post(h.upload, {}), await c.post(h.loginOptions, {}, { origin: 'https://evil.example' })]) {
      assert.equal(reply.headers.get('cache-control'), 'no-store');
      assert.equal(reply.headers.get('x-robots-tag'), 'noindex, nofollow');
      assert.match(reply.headers.get('content-type') ?? '', /^application\/json/);
    }
  });

  test(`[${rp.rpID}] 3. HTTP negatives: origin, fetch-site, content type, size, body shape, cookie, session age, another host's session`, async () => {
    const w = world(rp), c = w.client;
    for (const [name, handler] of ALL) {
      for (const bad of [null, 'https://evil.example', other.origins[0], `${origin}/`, origin.toUpperCase(), 'null']) {
        const refused = await c.post(handler, {}, { origin: bad });
        assert.equal(refused.status, 403, `${name} origin ${bad}`);
        assert.deepEqual(refused.body, { message: 'Forbidden.' });
      }
      for (const site of ['cross-site', 'same-site', 'none']) assert.equal((await c.post(handler, {}, { 'sec-fetch-site': site })).status, 403, `${name} ${site}`);
      assert.equal((await c.post(handler, {}, { 'content-type': 'text/plain' })).status, 415, name);
      assert.equal((await c.post(handler, {}, { 'content-type': null })).status, 415, name);
    }
    // Every accepted origin of this host works; curl sends no Sec-Fetch-Site and is judged on the rest.
    for (const o of rp.origins) assert.equal((await new Client(w.deps, o).post(h.loginOptions, {})).status, 200, o);
    assert.equal((await c.post(h.loginOptions, {}, { 'sec-fetch-site': null })).status, 200);
    assert.equal((await c.post(h.loginOptions, {}, { 'content-type': 'Application/JSON; charset=utf-8' })).status, 200);

    assert.equal((await c.post(h.loginOptions, { pad: 'x'.repeat(64 * 1024) })).status, 413, 'the bytes read are counted');
    assert.equal((await c.post(h.loginOptions, {}, { 'content-length': String(64 * 1024 + 1) })).status, 413, 'a declared length is enough');
    for (const body of ['', '{', '[]', 'null', '"text"', '7']) assert.equal((await c.post(h.loginOptions, body)).status, 400, `body ${body}`);
    // A chunked body declares no length: the reading stops AT the limit — 1 MB is on offer here, and most of it is never asked for.
    const sent = { chunks: 0, cancelled: false };
    const chunk = new TextEncoder().encode('x'.repeat(16 * 1024));
    const streamed = new ReadableStream<Uint8Array>({
      pull(controller) { if (++sent.chunks > 64) controller.close(); else controller.enqueue(chunk); },
      cancel() { sent.cancelled = true; },
    }, { highWaterMark: 0 });
    const chunked = new Request(`${origin}/api/admin/login/options`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: streamed, duplex: 'half' } as RequestInit);
    assert.equal(chunked.headers.get('content-length'), null);
    assert.equal((await h.loginOptions(chunked, w.deps)).status, 413);
    assert.ok(sent.cancelled, 'the sender is told to stop');
    assert.ok(sent.chunks <= 8, `64 KB fit in four chunks; ${sent.chunks} of 64 were taken`);
    // …and a body that arrives in pieces is put together again, a character split between two pieces included.
    const pieces = [...Buffer.from(JSON.stringify({ pad: 'é'.repeat(10) }))].map((byte) => Uint8Array.of(byte));
    const inPieces = new Request(`${origin}/api/admin/login/options`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: new ReadableStream<Uint8Array>({ pull(controller) { const next = pieces.shift(); if (next) controller.enqueue(next); else controller.close(); } }), duplex: 'half' } as RequestInit);
    assert.equal((await h.loginOptions(inPieces, w.deps)).status, 200);

    // upload: the session is judged from the headers, before one byte of the body is read
    const huge = JSON.stringify({ ...SKILLS_UPLOAD, pad: 'x'.repeat(2 * 1024 * 1024) });
    assert.equal((await c.post(h.upload, huge)).status, 401, 'no cookie');
    assert.equal((await enrol(c, new SoftAuthenticator())).status, 200);
    assert.equal((await c.post(h.upload, huge)).status, 413);
    assert.equal((await c.post(h.upload, SKILLS_UPLOAD)).status, 200);

    const good = c.cookie, name = sessionCookieName(rp), token = String(c.token);
    const tampered = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
    for (const cookie of [`${name}=${tampered}`, `${name}=${token.slice(1)}`, `${name}=${token}=`, `${name}=${'!'.repeat(43)}`, `${name}=`, `session=${token}`, `${sessionCookieName(other)}=${token}`]) {
      c.cookie = cookie;
      assert.equal((await c.post(h.upload, SKILLS_UPLOAD)).status, 401, cookie.replace(token, '<token>'));
    }
    c.cookie = `theme=dark; ${good}; other=1`;
    assert.equal((await c.post(h.upload, SKILLS_UPLOAD)).status, 200, 'found among other cookies');

    // 12 hours, absolute: using the session does not renew it
    c.cookie = good;
    w.clock.t += 12 * HOURS - 1;
    assert.equal((await c.post(h.upload, SKILLS_UPLOAD)).status, 200);
    w.clock.t += 1;
    assert.equal((await c.post(h.upload, SKILLS_UPLOAD)).status, 401);
    assert.equal(await h.sessionFromToken(token, w.deps), null);

    // One database, two hosts: a session opened on one means nothing to the handlers of the other.
    const here = world(rp), there = world(other, { store: here.store, clock: here.clock });
    await enrol(here.client, new SoftAuthenticator());
    await enrol(there.client, new SoftAuthenticator());
    assert.equal((await here.client.post(h.upload, SKILLS_UPLOAD)).status, 200);
    there.client.cookie = `${sessionCookieName(other)}=${here.client.token}`;
    assert.equal((await there.client.post(h.upload, SKILLS_UPLOAD)).status, 401);
    assert.equal(await h.sessionFromToken(here.client.token, there.deps), null);
    // Belt and braces: a session document of the other host is refused even when it names a passkey of this one.
    const [mine] = await here.store.listCredentials(rp.rpID);
    const planted = 'A'.repeat(43);
    await here.store.saveSession({ _id: hashToken(planted), rpId: other.rpID, credentialId: mine._id, createdAt: here.deps.now(), expiresAt: new Date(+here.deps.now() + HOURS) });
    assert.equal(await h.sessionFromToken(planted, here.deps), null);
    Object.assign(here.store.sessions.get(hashToken(planted)) ?? {}, { rpId: rp.rpID });
    assert.ok(await h.sessionFromToken(planted, here.deps), 'the same document under this host is a session — the rpId was what refused it');
  });

  test(`[${rp.rpID}] 4. WebAuthn negatives at sign-in: one answer for every cause, no session, the challenge is spent`, async () => {
    const w = world(rp), c = w.client;
    const passkey = new SoftAuthenticator(), deviceBound = new SoftAuthenticator({ synced: false }), stranger = new SoftAuthenticator();
    await enrol(c, passkey);
    const added = await c.post(h.registerOptions, {});
    assert.equal((await c.post(h.registerVerify, { response: deviceBound.create(creation(added.body), origin) })).status, 200);
    await c.post(h.logout, {});
    assert.equal(w.store.sessions.size, 0);

    const attempt = async (make: (options: RequestOptions) => unknown, why: string) => {
      const options = await c.post(h.loginOptions, {});
      const reply = await c.post(h.loginVerify, { response: make(request(options.body)) });
      assert.equal(reply.status, 401, why);
      assert.deepEqual(reply.body, { message: 'Sign-in failed.' }, why);
      assert.deepEqual(reply.setCookie, [], why);
      return request(options.body);
    };

    logged.length = 0;
    const spent = await attempt((o) => passkey.get(o, 'https://evil.example'), 'foreign origin in clientDataJSON');
    assert.ok(logged.some((line) => /origin/i.test(line)), 'the library’s reason is in the log — and only there');
    assert.equal((await c.post(h.loginVerify, { response: passkey.get(spent, origin) })).status, 401, 'the failed attempt burned its challenge');
    await attempt((o) => passkey.get(o, other.origins[0]), 'the other host’s origin');
    await attempt((o) => passkey.get(o, origin, other.rpID), 'rpIdHash of another rpId');
    await attempt((o) => passkey.get(o, origin, 'evil.example'), 'rpIdHash of a stranger');
    await attempt((o) => stranger.get(o, origin), 'a passkey nobody enrolled');
    await attempt((o) => ({ ...stranger.get(o, origin), id: passkey.get(o, origin).id, rawId: passkey.get(o, origin).id }), 'forged signature: the right id, signed by another key');
    await attempt((o) => { const a = passkey.get(o, origin); return { ...a, response: { ...a.response, authenticatorData: deviceBound.get(o, origin).response.authenticatorData } }; }, 'authenticator data swapped under the signature');
    // clientDataJSON is the client's JSON. The signature below is good — what is refused is a challenge that is not a string.
    for (const forged of [{ $gt: '' }, { $ne: null }, null, 42]) {
      const live = await attempt((o) => passkey.get({ ...o, challenge: forged as unknown as string }, origin), `a challenge of ${JSON.stringify(forged)}`);
      assert.ok(w.store.challenges.has(live.challenge), 'and the challenge that was live is still there');
    }
    await attempt(() => undefined, 'no response at all');
    await attempt(() => ({ id: 42 }), 'not a WebAuthn response');

    // the enrolled passkey, answering without user verification (TypeScript's `private` is compile-time only)
    Object.assign(passkey, { uv: false });
    await attempt((o) => passkey.get(o, origin), 'user verification off');
    Object.assign(passkey, { uv: true });

    // a replayed assertion
    const options = await c.post(h.loginOptions, {});
    const assertion = passkey.get(request(options.body), origin);
    assert.equal((await c.post(h.loginVerify, { response: assertion })).status, 200);
    await c.post(h.logout, {});
    const replay = await c.post(h.loginVerify, { response: assertion });
    assert.equal(replay.status, 401);
    assert.deepEqual(replay.setCookie, []);

    // a challenge older than 5 minutes — still in the store, the TTL monitor is not what refuses it
    const late = await c.post(h.loginOptions, {});
    w.clock.t += 5 * MINUTES;
    assert.ok(w.store.challenges.has(String(late.body.challenge)));
    assert.equal((await c.post(h.loginVerify, { response: passkey.get(request(late.body), origin) })).status, 401);
    const inTime = await c.post(h.loginOptions, {});
    w.clock.t += 5 * MINUTES - 1;
    assert.equal((await c.post(h.loginVerify, { response: passkey.get(request(inTime.body), origin) })).status, 200);

    // a registration challenge spent on a sign-in: refused, and it is not even consumed
    const registration = await c.post(h.registerOptions, {});
    assert.equal(registration.status, 200);
    await c.post(h.logout, {});
    assert.equal((await c.post(h.loginVerify, { response: passkey.get({ challenge: String(registration.body.challenge), rpId: rp.rpID }, origin) })).status, 401);
    assert.equal(w.store.challenges.get(String(registration.body.challenge))?.kind, 'registration');

    // a device-bound counter going backwards: a clone is out there
    assert.equal((await signIn(c, deviceBound)).status, 200);
    await c.post(h.logout, {});
    const doc = await w.store.findCredential(rp.rpID, Buffer.from(deviceBound.credentialId).toString('base64url'));
    assert.ok(doc && doc.counter > 0);
    doc.counter += 10;
    const before = { ...doc };
    assert.equal((await signIn(c, deviceBound)).status, 401);
    assert.deepEqual(doc, before, 'a refused sign-in records nothing');
    assert.equal(w.store.sessions.size, 0);

    // one database, two hosts: a passkey of the other host does not exist here
    const there = world(other, { store: w.store, clock: w.clock });
    assert.equal((await signIn(there.client, passkey)).status, 401);
    const lo = await there.client.post(h.loginOptions, {});
    assert.equal((await there.client.post(h.loginVerify, { response: passkey.get(request(lo.body), other.origins[0]) })).status, 401);
    assert.equal(there.client.cookie, '');
  });

  test(`[${rp.rpID}] 4b. WebAuthn negatives at enrolment`, async () => {
    const w = world(rp), c = w.client;
    const refusedWith = async (make: (options: CreationOptions) => unknown, why: string) => {
      const options = await c.post(h.registerOptions, { secret: SECRET });
      assert.equal(options.status, 200, why);
      const reply = await c.post(h.registerVerify, { response: make(creation(options.body)) });
      assert.equal(reply.status, 400, why);
      assert.deepEqual(reply.body, { message: 'Passkey could not be registered.' }, why);
      assert.deepEqual(reply.setCookie, [], why);
      assert.equal(w.store.challenges.has(String(options.body.challenge)), false, `${why}: the challenge is spent`);
    };
    await refusedWith((o) => new SoftAuthenticator().create(o, 'https://evil.example'), 'foreign origin');
    await refusedWith((o) => new SoftAuthenticator().create(o, other.origins[0]), 'the other host’s origin');
    await refusedWith((o) => new SoftAuthenticator().create(o, origin, other.rpID), 'rpIdHash of another rpId');
    await refusedWith((o) => new SoftAuthenticator({ userVerified: false }).create(o, origin), 'user verification off');
    assert.equal(w.store.credentials.size, 0);

    for (const response of [undefined, null, 'text', {}, { id: 'x' }]) assert.equal((await c.post(h.registerVerify, { response })).status, 400);

    // expired, replayed, and a sign-in challenge offered for an enrolment
    const late = await c.post(h.registerOptions, { secret: SECRET });
    w.clock.t += 5 * MINUTES;
    assert.equal((await c.post(h.registerVerify, { response: new SoftAuthenticator().create(creation(late.body), origin) })).status, 400);
    const login = await c.post(h.loginOptions, {});
    assert.equal((await c.post(h.registerVerify, { response: new SoftAuthenticator().create({ ...creation(late.body), challenge: String(login.body.challenge) }, origin) })).status, 400);
    assert.equal(w.store.credentials.size, 0);

    const passkey = new SoftAuthenticator();
    const options = await c.post(h.registerOptions, { secret: SECRET });
    // The owner is looking at Touch ID; this challenge is live and authorised by the secret. Nothing signs
    // clientDataJSON at enrolment, and its challenge is whatever JSON the client wrote. In a Mongo filter
    // { "$gt": "" } matches ANY live challenge (MemoryStore reads it the same way), so a stranger with no secret and
    // no cookie would take the owner's challenge and enrol the first passkey. Only a string is ever looked up.
    const thief = new Client(w.deps);
    for (const forged of [{ $gt: '' }, { $ne: null }, { $in: [String(options.body.challenge)] }, [String(options.body.challenge)], null, 42, true]) {
      const stolen = await thief.post(h.registerVerify, { response: new SoftAuthenticator().create({ ...creation(options.body), challenge: forged as unknown as string }, origin), label: 'owned' });
      assert.equal(stolen.status, 400, JSON.stringify(forged));
      assert.deepEqual(stolen.body, { message: 'Passkey could not be registered.' });
      assert.deepEqual(stolen.setCookie, []);
    }
    assert.equal(w.store.credentials.size, 0);
    assert.equal(w.store.sessions.size, 0);
    assert.ok(w.store.challenges.has(String(options.body.challenge)), 'the owner’s challenge is still theirs');
    const response = passkey.create(creation(options.body), origin);
    assert.equal((await c.post(h.registerVerify, { response })).status, 200);
    assert.equal((await c.post(h.registerVerify, { response })).status, 400, 'the same response again: its challenge is spent');
    // The same passkey with a fresh challenge (a browser would have stopped at excludeCredentials).
    const again = await c.post(h.registerOptions, {});
    const duplicate = await c.post(h.registerVerify, { response: passkey.create(creation(again.body), origin) });
    assert.equal(duplicate.status, 409);
    assert.deepEqual(duplicate.body, { message: 'This passkey is already registered.' });
    assert.equal(w.store.credentials.size, 1);
  });

  test(`[${rp.rpID}] 5. the enrolment gate: the secret opens it only while no passkey exists`, async () => {
    const w = world(rp), c = w.client;
    // The last three are valid JSON that String() either cannot convert ({ toString: 1 } throws) or converts INTO the secret.
    for (const secret of ['wrong', '', SECRET.slice(0, -1), `${SECRET} `, undefined, 42, null, { $ne: '' }, { toString: 1 }, { valueOf: null, toString: null }, [SECRET]]) {
      const refused = await c.post(h.registerOptions, { secret });
      assert.equal(refused.status, 403, `secret ${JSON.stringify(secret)}`);
      assert.deepEqual(refused.body, { message: 'Forbidden.' });
    }
    assert.equal(w.store.challenges.size, 0, 'a refusal leaves nothing behind');

    for (const weak of [undefined, '', 'fifteen-chars!!']) {
      const disabled = await world(rp, { secret: weak }).client.post(h.registerOptions, { secret: weak ?? '' });
      assert.equal(disabled.status, 503, `configured secret ${JSON.stringify(weak)}`);
      assert.deepEqual(disabled.body, { message: ENROLMENT_DISABLED });
    }
    assert.equal((await world(rp, { secret: 'sixteen-chars!!!' }).client.post(h.registerOptions, { secret: 'sixteen-chars!!!' })).status, 200);

    // locked: the same answer whatever the secret, so the endpoint is no oracle for it — also with a broken configuration
    assert.equal((await enrol(c, new SoftAuthenticator())).status, 200);
    const stranger = new Client(w.deps);
    const right = await stranger.post(h.registerOptions, { secret: SECRET }), wrong = await stranger.post(h.registerOptions, { secret: 'wrong' });
    assert.equal(right.status, 403);
    assert.deepEqual(right.body, { message: 'Registration is closed.' });
    assert.deepEqual([wrong.status, wrong.body], [right.status, right.body]);
    const unset = world(rp, { secret: undefined, store: w.store });
    assert.deepEqual((await unset.client.post(h.registerOptions, { secret: SECRET })).body, right.body);
    assert.equal((await c.post(h.registerOptions, {})).status, 200, 'the signed-in owner still adds passkeys');

    // two holders of the secret race for the first passkey: both hold a valid challenge, one wins
    const race = world(rp), a = new Client(race.deps), b = new Client(race.deps);
    const [oa, ob] = [await a.post(h.registerOptions, { secret: SECRET }), await b.post(h.registerOptions, { secret: SECRET })];
    const replies = await Promise.all([
      a.post(h.registerVerify, { response: new SoftAuthenticator().create(creation(oa.body), origin) }),
      b.post(h.registerVerify, { response: new SoftAuthenticator().create(creation(ob.body), origin) }),
    ]);
    assert.deepEqual(replies.map((r) => r.status).sort(), [200, 403]);
    const loser = replies.find((r) => r.status === 403);
    assert.deepEqual(loser?.body, { message: 'Registration is closed.' });
    assert.deepEqual(loser?.setCookie, []);
    assert.equal(race.store.credentials.size, 1);
    assert.equal(race.store.sessions.size, 1);
  });

  test(`[${rp.rpID}] 5b. a session adds a passkey only in its first 5 minutes: a copied cookie cannot turn its 12 hours into a passkey`, async () => {
    const w = world(rp), c = w.client;
    const first = new SoftAuthenticator();
    assert.equal((await enrol(c, first)).status, 200);
    w.clock.t += 5 * MINUTES;
    const inTime = await c.post(h.registerOptions, {});
    assert.equal(inTime.status, 200, 'exactly 5 minutes is still in time');
    w.clock.t += 1;
    const copied = new Client(w.deps);
    copied.cookie = c.cookie;
    const late = await copied.post(h.registerOptions, {});
    assert.equal(late.status, 403);
    assert.deepEqual(late.body, { message: 'A passkey can only be added within 5 minutes of signing in. Sign out, sign in again, then add it.' });
    assert.equal(w.store.challenges.size, 1, 'a refusal leaves nothing behind');
    assert.equal((await copied.post(h.upload, SKILLS_UPLOAD)).status, 200, 'for everything else the session is as good as before');
    // The ceremony that began in time may finish: its challenge has 5 minutes of its own.
    // `transports` is the one field the library passes through unread; only a handful of strings is kept of it.
    const second = new SoftAuthenticator().create(creation(inTime.body), origin);
    const hostile = { ...second, response: { ...second.response, transports: ['usb', { $gt: '' }, 7, null, ['nfc'], ...Array.from({ length: 20 }, (_, i) => `t${i}`)] } };
    assert.equal((await c.post(h.registerVerify, { response: hostile })).status, 200);
    assert.deepEqual([...w.store.credentials.values()][1].transports, ['usb', 't0', 't1', 't2', 't3', 't4', 't5', 't6']);

    // Signing in again is the way — and a new session elsewhere does not make the old cookie young.
    const fresh = new Client(w.deps);
    assert.equal((await signIn(fresh, first)).status, 200);
    assert.equal((await fresh.post(h.registerOptions, {})).status, 200);
    assert.equal((await copied.post(h.registerOptions, {})).status, 403);
    assert.equal(w.store.credentials.size, 2);
  });

  test(`[${rp.rpID}] 6. critique 5: a session dies with the passkey that opened it`, async () => {
    const w = world(rp), c = w.client;
    const first = new SoftAuthenticator(), second = new SoftAuthenticator();
    await enrol(c, first);
    const options = await c.post(h.registerOptions, {});
    assert.equal((await c.post(h.registerVerify, { response: second.create(creation(options.body), origin) })).status, 200);
    assert.equal((await c.post(h.upload, SKILLS_UPLOAD)).status, 200);
    assert.ok(await h.sessionFromToken(c.token, w.deps));
    const pending = await c.post(h.registerOptions, {}); // an add-passkey ceremony already under way

    w.store.credentials.delete(Buffer.from(first.credentialId).toString('base64url')); // "delete the document in Atlas"

    assert.equal((await c.post(h.upload, SKILLS_UPLOAD)).status, 401);
    assert.equal(await h.sessionFromToken(c.token, w.deps), null);
    assert.equal((await viewFor(w.deps, c.token, null)).state, 'signin');
    const closed = await c.post(h.registerOptions, {});
    assert.equal(closed.status, 403);
    assert.deepEqual(closed.body, { message: 'Registration is closed.' });
    const finished = await c.post(h.registerVerify, { response: new SoftAuthenticator().create(creation(pending.body), origin) });
    assert.equal(finished.status, 403, 'the ceremony that was under way cannot finish either');
    assert.equal(w.store.credentials.size, 1);
    assert.equal(w.applied.length, 1);

    // The other passkey is untouched; and with every document gone the page is back at enrolment.
    assert.equal((await signIn(c, second)).status, 200);
    w.store.credentials.clear();
    assert.equal((await c.post(h.upload, SKILLS_UPLOAD)).status, 401);
    assert.equal((await c.post(h.registerOptions, {})).status, 403, 'no passkey left: only the secret opens enrolment, a stale session does not');
    assert.equal((await viewFor(w.deps, c.token, null)).state, 'enrol');
  });

  test(`[${rp.rpID}] 7. critique 6: the cap counts live sign-in challenges of this host only, and never blocks enrolment`, async () => {
    const here = world(rp), there = world(other, { store: here.store, clock: here.clock });
    const now = here.deps.now(), expiresAt = new Date(+now + 5 * MINUTES);
    for (let i = 0; i < h.MAX_LOGIN_CHALLENGES; i++) await here.store.saveChallenge({ _id: `flood-${i}`, kind: 'authentication', rpId: rp.rpID, createdAt: now, expiresAt });
    for (let i = 0; i < h.MAX_LOGIN_CHALLENGES + 10; i++) await here.store.saveChallenge({ _id: `enrolment-${i}`, kind: 'registration', rpId: rp.rpID, authorisedBy: 'secret', createdAt: now, expiresAt });
    assert.equal(h.MAX_LOGIN_CHALLENGES, 5_000);

    assert.equal((await here.client.post(h.loginOptions, {})).status, 200, 'exactly 5,000 is still allowed');
    const capped = await here.client.post(h.loginOptions, {});
    assert.equal(capped.status, 429);
    assert.deepEqual(capped.body, { message: 'Too many sign-in attempts in progress. Try again in a few minutes.' });
    assert.equal((await there.client.post(h.loginOptions, {})).status, 200, 'the other host is not held back');
    assert.equal((await here.client.post(h.registerOptions, { secret: SECRET })).status, 200, 'enrolment and recovery are never capped');
    // Recovery enrolment signs the owner in without login/options: there is always a way in.
    assert.equal((await enrol(here.client, new SoftAuthenticator())).status, 200);
    assert.equal((await here.client.post(h.upload, SKILLS_UPLOAD)).status, 200);

    here.clock.t += 5 * MINUTES;
    assert.equal((await here.client.post(h.loginOptions, {})).status, 200, 'expired documents the TTL monitor has not reaped do not count');
    assert.ok(here.store.challenges.size > 2 * h.MAX_LOGIN_CHALLENGES, 'they are all still in the store');
  });

  test(`[${rp.rpID}] 8. critique 7: one constant WebAuthn user — enrolling again overwrites the provider's entry`, async () => {
    const w = world(rp), c = w.client;
    const first = await c.post(h.registerOptions, { secret: SECRET });
    assert.equal((await c.post(h.registerVerify, { response: new SoftAuthenticator().create(creation(first.body), origin) })).status, 200);
    w.store.credentials.clear(); // every device lost: the documents are deleted in Atlas
    c.cookie = '';
    const again = await c.post(h.registerOptions, { secret: SECRET });
    assert.equal((await c.post(h.registerVerify, { response: new SoftAuthenticator().create(creation(again.body), origin) })).status, 200);

    const userOf = (body: Record<string, unknown>) => body.user as { id: string; name: string; displayName: string };
    assert.deepEqual(userOf(first.body), { id: Buffer.from(`owner:${rp.rpID}`).toString('base64url'), name: 'owner', displayName: 'Site owner' });
    assert.deepEqual(userOf(again.body), userOf(first.body));
    assert.notEqual(first.body.challenge, again.body.challenge);
    const elsewhere = await world(other).client.post(h.registerOptions, { secret: SECRET });
    assert.notEqual(userOf(elsewhere.body).id, userOf(first.body).id);
    assert.deepEqual([first.body.rp, elsewhere.body.rp], [{ name: rp.rpName, id: rp.rpID }, { name: other.rpName, id: other.rpID }]);
  });

  test(`[${rp.rpID}] 9. what the page is told: five states, and passkeys without ids or keys`, async () => {
    const w = world(rp), c = w.client;
    assert.deepEqual(await viewFor(w.deps, undefined, null), { state: 'enrol', hostHint: null });
    assert.deepEqual(await viewFor(world(rp, { secret: 'fifteen-chars!!' }).deps, undefined, 'a hint'), { state: 'enrol-disabled', hostHint: 'a hint' });

    await enrol(c, new SoftAuthenticator(), { label: 'MacBook' });
    const signedIn = await viewFor(w.deps, c.token, null);
    assert.deepEqual(signedIn, { state: 'upload', hostHint: null, passkeys: [{ label: 'MacBook', createdAt: '2026-09-19T00:00:00.000Z', lastUsedAt: null, synced: true }] });
    const [doc] = [...w.store.credentials.values()];
    assert.deepEqual(Object.keys(summary(doc)).sort(), ['createdAt', 'label', 'lastUsedAt', 'synced']);
    for (const secret of [doc._id, doc.publicKey, doc.aaguid, String(c.token)]) assert.ok(!JSON.stringify(signedIn).includes(secret));

    for (const token of [undefined, '', 'x'.repeat(43), String(c.token).slice(1)]) assert.deepEqual(await viewFor(w.deps, token, null), { state: 'signin', hostHint: null });
    assert.equal((await viewFor(world(other, { store: w.store }).deps, c.token, null)).state, 'enrol', 'the other host sees neither the passkey nor the session');

    // Mongo down: the page offers nothing — least of all enrolment.
    const down = world(rp, { store: new Proxy(new MemoryStore(), { get: () => async () => { throw new Error('server selection timed out'); } }) });
    assert.deepEqual(await viewFor(down.deps, c.token, null), { state: 'unavailable', hostHint: null });
    const unavailable = await down.client.post(h.loginOptions, {});
    assert.equal(unavailable.status, 503);
    assert.deepEqual(unavailable.body, { message: 'Admin is unavailable.' });
    assert.equal((await down.client.post(h.upload, SKILLS_UPLOAD, { cookie: c.cookie })).status, 503);
  });
}

test('9. cleanLabel: control characters go, 60 code points stay, an emoji at the cut is not split, anything else is the fallback', () => {
  assert.equal(cleanLabel(' a' + String.fromCharCode(0, 7, 9, 10, 13, 0x1b, 0x7f, 0x85, 0x9f) + 'b ', 'x'), 'ab');
  assert.equal(cleanLabel('Work  laptop', 'x'), 'Work  laptop');
  assert.equal(cleanLabel('x'.repeat(61), 'f'), 'x'.repeat(60));
  assert.equal(cleanLabel('x'.repeat(60), 'f'), 'x'.repeat(60));
  const emoji = String.fromCodePoint(0x1f511); // a key: two UTF-16 units, one code point
  const cut = cleanLabel('x'.repeat(59) + emoji + 'tail', 'f');
  assert.equal(cut, 'x'.repeat(59) + emoji);
  assert.equal(Array.from(cut).length, 60);
  assert.equal(cleanLabel(emoji.repeat(80), 'f'), emoji.repeat(60));
  assert.equal(cleanLabel('x'.repeat(59) + '  tail', 'f'), 'x'.repeat(59), 'trimmed again after the cut');
  for (const input of [undefined, null, 42, {}, ['a'], '', '   ', '\t\n', String.fromCharCode(0x85)]) assert.equal(cleanLabel(input, 'Synced passkey'), 'Synced passkey');
});

test('9. the host hint is a sentence for the owner, nothing more', () => {
  const prod = relyingParty('production'), local = relyingParty('development');
  assert.equal(hostHint(prod, 'nhatminh.dev'), null);
  assert.equal(hostHint(prod, 'NHATMINH.DEV'), null);
  for (const host of ['www.nhatminh.dev', 'morning-kafes-2604.netlify.app', 'deploy-preview-110--morning-kafes-2604.netlify.app', 'localhost:3001']) {
    assert.equal(hostHint(prod, host), 'Admin works only on https://nhatminh.dev', host);
  }
  for (const host of ['localhost:3001', 'localhost:3000', 'localhost:8888']) assert.equal(hostHint(local, host), null, host);
  assert.equal(hostHint(local, '127.0.0.1:3001'), 'Open http://localhost:3001');
  assert.equal(hostHint(local, '127.0.0.1:3000'), 'Open http://localhost:3000');
  assert.equal(hostHint(local, '192.168.1.20:4000'), 'Open http://localhost:3001');
  assert.equal(hostHint(local, '[::1]:8888'), 'Open http://localhost:8888');
  assert.equal(hostHint(prod, null), null);
});
