// netlify/functions/feeds/__tests__/harness.ts — fakes for the feed tests: a Db that records what a feed writes,
// a fetch that answers from saved upstream responses (./fixtures), a frozen clock, and per-test env and console.
// Every fake is put back after its test, so a test can never leak into the next one.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { STATUS_CODES } from "node:http";
import type { TestContext } from "node:test";
import type { Db, Document } from "mongodb";

export type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const at = (name: string) => new URL(`./fixtures/${name}`, import.meta.url);

const undo = new WeakMap<TestContext, (() => void)[]>();
/**
 * Runs `step` after the test. t.after runs hooks first-registered-first; these run last-first, like nested finally
 * blocks, so a test may stack fakes (env set twice, say) and still end with the original. Every step runs even when
 * one throws; the first error then fails the test.
 */
function onEnd(t: TestContext, step: () => void) {
  let steps = undo.get(t);
  if (!steps) {
    const registered: (() => void)[] = (steps = []);
    undo.set(t, registered);
    t.after(() => {
      const errors: unknown[] = [];
      for (const s of registered.reverse()) {
        try {
          s();
        } catch (err) {
          errors.push(err);
        }
      }
      if (errors.length) throw errors[0];
    });
  }
  steps.push(step);
}

/** A saved upstream response as text. */
export const fixture = (name: string) => readFileSync(at(name), "utf8");
/** A saved JSON response, parsed: for the tests that alter one field of a real shape. */
export const fixtureJson = (name: string): Any => JSON.parse(fixture(name));

const TYPES: Record<string, string> = {
  json: "application/json; charset=UTF-8",
  xml: "application/rss+xml; charset=UTF-8",
  html: "text/html; charset=UTF-8",
  jpg: "image/jpeg",
};

/** A response with the status line a server would send ("403 Forbidden"): the feeds put it into their error messages. */
export function respond(body: string | Uint8Array<ArrayBuffer> | null, status = 200, type = TYPES.html): Response {
  return new Response(body, { status, statusText: STATUS_CODES[status] ?? "", headers: { "content-type": type } });
}
export const json = (value: unknown, status = 200) => respond(JSON.stringify(value), status, TYPES.json);
/** A fixture file byte for byte, typed by its extension. */
export const file = (name: string, status = 200) =>
  respond(new Uint8Array(readFileSync(at(name))), status, TYPES[name.split(".").pop() ?? ""] ?? "application/octet-stream");

/**
 * What the fake upstream answers for a URL: a fixture file name, a bare status code (with a status-page body), or a
 * function for anything else. Functions make a new Response per request, because a body can be read only once.
 */
export type Answer = string | number | (() => Response | Promise<Response>);

/** The response an Answer stands for; for a route whose answer a test changes between runs. */
export function answer(a: Answer): Response | Promise<Response> {
  if (typeof a === "function") return a();
  if (typeof a === "number") return respond(`<html><body><h1>${a} ${STATUS_CODES[a]}</h1></body></html>`, a);
  return file(a);
}

export interface Sent {
  url: string;
  method: string;
  /** Lower-cased names, as the Headers class gives them. */
  headers: Record<string, string>;
}

/**
 * Replaces fetch for one test. `routes` maps exact URLs to answers, or is a function of the URL (undefined: no route).
 * A URL without a route fails as a network error would; since feeds swallow some failures on purpose, each test also
 * checks the list of requests this returns. After the test, every request must have carried an AbortSignal: a scheduled
 * function has 30 s in all, so an upstream that hangs must not be waited on for ever.
 */
export function upstream(t: TestContext, routes: Record<string, Answer> | ((url: string, init: RequestInit) => Answer | undefined)): Sent[] {
  const sent: Sent[] = [];
  const untimed: string[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = input instanceof Request ? input.url : String(input);
    sent.push({ url, method: init.method ?? "GET", headers: Object.fromEntries(new Headers(init.headers)) });
    if (!(init.signal instanceof AbortSignal)) untimed.push(url);
    const route = typeof routes === "function" ? routes(url, init) : routes[url];
    if (route === undefined) throw new TypeError(`fetch failed (no route for ${url})`);
    return answer(route);
  };
  onEnd(t, () => {
    globalThis.fetch = real;
    assert.deepEqual(untimed, [], "every upstream request carries a timeout");
  });
  return sent;
}

/** The URLs a feed asked for, in order; with `method`, prefixed by it ("HEAD https://…"). */
export const urls = (sent: Sent[], method = false) => sent.map((s) => (method ? `${s.method} ${s.url}` : s.url));

export interface Call {
  coll: string;
  op: string;
  args: unknown[];
}

/**
 * A Db with only the collection methods feeds/lib.ts and the verse feed use, recording each call. insertMany hands out
 * ids ("tech-1", "tech-2", …) the way the driver hands out ObjectIds; findOne answers from `stored`.
 */
export function fakeDb({ stored = {}, findOne }: { stored?: Record<string, Document[]>; findOne?: (coll: string, filter: Document) => Promise<Document | null> } = {}) {
  const calls: Call[] = [];
  let next = 0;
  const collection = (coll: string) => {
    const record = (op: string, ...args: unknown[]) => calls.push({ coll, op, args });
    return {
      async insertMany(docs: Document[]) {
        record("insertMany", docs);
        const insertedIds: Record<number, string> = {};
        docs.forEach((_, i) => (insertedIds[i] = `${coll}-${++next}`));
        return { acknowledged: true, insertedCount: docs.length, insertedIds };
      },
      async deleteMany(filter: Document) {
        record("deleteMany", filter);
        return { acknowledged: true, deletedCount: 0 };
      },
      async replaceOne(filter: Document, doc: Document, options?: Document) {
        record("replaceOne", filter, doc, options);
        return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: null };
      },
      async updateOne(filter: Document, update: Document, options?: Document) {
        record("updateOne", filter, update, options);
        return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: null };
      },
      async findOne(filter: Document) {
        record("findOne", filter);
        if (findOne) return findOne(coll, filter);
        return stored[coll]?.find((d) => d._id === filter._id) ?? null;
      },
    };
  };
  return {
    db: { collection } as unknown as Db,
    calls,
    /** "collection.method" for each call, in order. */
    ops: () => calls.map((c) => `${c.coll}.${c.op}`),
    /** The documents a list was last replaced with (writeCollection), or undefined. */
    list: (coll: string) => calls.findLast((c) => c.coll === coll && c.op === "insertMany")?.args[0] as Document[] | undefined,
  };
}

/** One singleton write as writeSingleton makes it: the whole document replaced, created when missing. */
export const replaced = (id: string, doc: Document): Call => ({ coll: "singletons", op: "replaceOne", args: [{ _id: id }, doc, { upsert: true }] });

/** Freezes the clock for one test: `new Date()` and `Date.now()` read `iso`. Dates built from a value are real ones. */
export function frozenAt(t: TestContext, iso: string): number {
  const Real = Date;
  const now = Real.parse(iso);
  class Frozen extends Real {
    constructor(...args: unknown[]) {
      // Whatever arguments were given go through unchanged; the tuple type only satisfies Date's overloads.
      super(...((args.length ? args : [now]) as [number]));
    }
    static now() {
      return now;
    }
  }
  globalThis.Date = Frozen as unknown as DateConstructor;
  onEnd(t, () => {
    globalThis.Date = Real;
  });
  return now;
}

/** Sets environment variables for one test (undefined unsets one) and restores the previous values after it. */
export function withEnv(t: TestContext, vars: Record<string, string | undefined>) {
  const set = (name: string, value: string | undefined) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };
  const before = Object.keys(vars).map((name) => [name, process.env[name]] as const);
  for (const [name, value] of Object.entries(vars)) set(name, value);
  onEnd(t, () => before.forEach(([name, value]) => set(name, value)));
}

/** Silences the feeds' logging for one test; the mocks record what was said. */
export function quiet(t: TestContext) {
  return {
    log: t.mock.method(console, "log", () => {}),
    warn: t.mock.method(console, "warn", () => {}),
    error: t.mock.method(console, "error", () => {}),
  };
}
