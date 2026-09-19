// The browser's half of the handler tests: a cookie jar fed from Set-Cookie, and the headers a same-origin
// fetch() sends (Origin, Sec-Fetch-Site, JSON). The handlers are called directly — no server, no network.
import * as h from '../handlers.ts';
import type { CvWrite } from '../cvUpload.ts';
import type { RelyingParty } from '../rp.ts';
import { MemoryStore } from './memoryStore.ts';
import type { SoftAuthenticator } from './softAuthenticator.ts';

export type Handler = (req: Request, deps: h.AdminDeps) => Promise<Response>;
export interface Reply { status: number; body: Record<string, unknown>; setCookie: string[]; headers: Headers }
export type CreationOptions = Parameters<SoftAuthenticator['create']>[0];
export type RequestOptions = Parameters<SoftAuthenticator['get']>[0];

export class Client {
  /** "name=value" of the session cookie, or "" — what the browser would send back. Tests may overwrite it. */
  cookie = '';
  readonly deps: h.AdminDeps;
  readonly origin: string;

  constructor(deps: h.AdminDeps, origin: string = deps.rp.origins[0]) {
    this.deps = deps;
    this.origin = origin;
  }

  /** `headers`: a value replaces the browser's own, `null` leaves that header out. A string body is sent as it is. */
  async post(handler: Handler, body: unknown, headers: Record<string, string | null> = {}): Promise<Reply> {
    const all: Record<string, string | null> = { origin: this.origin, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json', cookie: this.cookie || null, ...headers };
    const sent = new Headers();
    for (const [name, value] of Object.entries(all)) if (value !== null) sent.set(name, value);
    const res = await handler(new Request(`${this.origin}/api/admin/under-test`, { method: 'POST', headers: sent, body: typeof body === 'string' ? body : JSON.stringify(body) }), this.deps);
    const setCookie = res.headers.getSetCookie();
    for (const line of setCookie) this.cookie = /; Max-Age=0(;|$)/.test(line) ? '' : line.split(';')[0];
    return { status: res.status, body: (await res.json()) as Record<string, unknown>, setCookie, headers: res.headers };
  }

  /** The bare token, as the page reads it from the cookie store. */
  get token(): string | undefined {
    return this.cookie ? this.cookie.slice(this.cookie.indexOf('=') + 1) : undefined;
  }
}

export const SECRET = 'a-long-enrolment-secret-of-36-chars!';

export interface World {
  store: MemoryStore;
  clock: { t: number };
  deps: h.AdminDeps;
  /** One entry per upload that reached the database. */
  applied: CvWrite[][];
  revalidated: string[];
  client: Client;
}

/** One deployment: a relying party, a store, a clock the test moves by hand. `secret: undefined` is "UPLOAD_SECRET_KEY is unset". */
export function world(rp: RelyingParty, opts: { secret?: string | undefined; store?: MemoryStore; clock?: { t: number } } = {}): World {
  const store = opts.store ?? new MemoryStore();
  const clock = opts.clock ?? { t: Date.parse('2026-09-19T00:00:00Z') };
  const applied: CvWrite[][] = [];
  const revalidated: string[] = [];
  const deps: h.AdminDeps = {
    store,
    rp,
    now: () => new Date(clock.t),
    enrolmentSecret: 'secret' in opts ? opts.secret : SECRET,
    cv: { apply: async (writes) => { applied.push(writes); }, revalidate: (section) => { revalidated.push(section); } },
  };
  return { store, clock, deps, applied, revalidated, client: new Client(deps) };
}

/** register/options + the passkey prompt + register/verify. Stops at the first refusal and returns it. */
export async function enrol(c: Client, passkey: SoftAuthenticator, extra: { secret?: string; label?: unknown } = {}): Promise<Reply> {
  const options = await c.post(h.registerOptions, { secret: extra.secret ?? SECRET });
  if (options.status !== 200) return options;
  return c.post(h.registerVerify, { response: passkey.create(options.body as unknown as CreationOptions, c.origin), label: extra.label });
}

/** login/options + the passkey prompt + login/verify. */
export async function signIn(c: Client, passkey: SoftAuthenticator): Promise<Reply> {
  const options = await c.post(h.loginOptions, {});
  if (options.status !== 200) return options;
  return c.post(h.loginVerify, { response: passkey.get(options.body as unknown as RequestOptions, c.origin) });
}

export const csvBase64 = (csv: string): string => Buffer.from(csv, 'utf-8').toString('base64');
export const SKILLS_UPLOAD = { sectionIdentifier: 'skills', fileName: 'Skills.csv', fileContentBase64: csvBase64('Name\nTypeScript\nMongoDB\n') };
