// src/app/admin/upload/PasskeyPanel.tsx
"use client";

// Who may upload. The server decides what this panel shows (adminView in src/lib/admin/deps.ts): the panel never
// asks "am I signed in?" — it runs a passkey ceremony, then calls router.refresh() and the page is rendered again
// with the new answer. Only types and src/lib/admin/sections.ts may be imported from src/lib/admin here: the rest
// of that folder pulls node:crypto or the database into the browser's chunk.
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { browserSupportsWebAuthn, startAuthentication, startRegistration, WebAuthnError } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import type { AdminView } from "@/lib/admin/view";

/** Said by the upload form on a 401 and by this panel once the form is gone. */
export const SESSION_ENDED = "Your session has ended — sign in again.";
const CHECKING = "Checking again…";

type Message = { type: "success" | "error" | "info"; text: string };
type Answer = { ok: true; data: unknown } | { ok: false; status: number; message: string };

async function post(path: string, body: Record<string, unknown>): Promise<Answer> {
  let res: Response;
  try {
    // Same-origin POST: the browser adds Origin and Sec-Fetch-Site itself, and the server checks both.
    res = await fetch(`/api/admin/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  } catch {
    return { ok: false, status: 0, message: "The server could not be reached. Try again." };
  }
  const data: unknown = await res.json().catch(() => null);
  if (res.ok) return { ok: true, data };
  const said = data && typeof data === "object" && "message" in data ? data.message : null;
  return { ok: false, status: res.status, message: typeof said === "string" ? said : `The request failed (${res.status}).` };
}

// The browser's own reasons, in the owner's words. A closed or timed-out prompt is NotAllowedError everywhere.
function ceremonyProblem(err: unknown, creating: boolean): Message {
  console.error("passkey prompt", err);
  if (err instanceof WebAuthnError && err.code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") return { type: "error", text: "This device already holds a passkey for this site. Use another device, or sign in with the one it has." };
  if (err instanceof Error && (err.name === "NotAllowedError" || (err instanceof WebAuthnError && err.code === "ERROR_CEREMONY_ABORTED"))) return { type: "info", text: "The passkey prompt was closed or timed out. Nothing was changed." };
  return { type: "error", text: creating ? "This device could not create the passkey." : "This device could not use the passkey." };
}

// UTC in ISO order on purpose: it is how Atlas shows createdAt, and this list exists so that a row here can be
// matched with a document there. A fixed format also comes out the same on the server and in the browser.
const stamp = (iso: string): string => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

const HEADINGS: Record<AdminView["state"], string> = {
  enrol: "Set up admin sign-in",
  "enrol-disabled": "Set up admin sign-in",
  signin: "Admin sign-in",
  upload: "Signed in",
  unavailable: "Admin is unavailable",
};

const LABEL = "block text-sm font-medium text-gray-700 dark:text-gray-300";
const INPUT = "mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm";
const TEXT = "text-sm text-gray-600 dark:text-gray-400";
const BUTTON = "w-full flex justify-center py-2 px-4 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500";
const primary = (off: boolean) => `${BUTTON} border-transparent text-white ${off ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"}`;
const secondary = (off: boolean) => `${BUTTON} border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 ${off ? "text-gray-400 dark:text-gray-500 cursor-not-allowed" : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"}`;
const TONE: Record<Message["type"], string> = {
  success: "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200",
  error: "bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200",
  info: "bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200",
};

export default function PasskeyPanel({ view, enrolmentDisabledReason }: { view: AdminView; enrolmentDisabledReason: string }) {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [label, setLabel] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  // null until the effect has looked: the server cannot know, and the first client render has to match it.
  const [supported, setSupported] = useState<boolean | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const shown = useRef(view.state);
  const signingOut = useRef(false);
  const retrying = useRef(false);

  useEffect(() => { setSupported(browserSupportsWebAuthn()); }, []);

  // "Try again" is the one control that does not go through run(). When the retry fails at once (no MONGODB_URI
  // locally) the button is grey for a few milliseconds and nothing else changes: it looks dead, and a screen
  // reader hears nothing. So the retry gets its own two sentences, and the first does not outlive the state.
  useEffect(() => {
    if (refreshing || !retrying.current) return;
    retrying.current = false;
    setMessage((m) => (view.state === "unavailable" ? { type: "error", text: "Still unavailable. Try again in a moment." } : m?.text === CHECKING ? null : m));
  }, [refreshing, view.state]);

  // The panel is rebuilt around whoever pressed the button, and that button is usually gone afterwards. Focus
  // goes to the heading instead of falling back to <body>, where a keyboard or a screen reader starts over.
  useEffect(() => {
    if (shown.current === view.state) return;
    const was = shown.current;
    shown.current = view.state;
    // A session also ends without this panel: 12 hours are up, or its passkey was deleted in Atlas. The upload
    // form says so on its 401 and then leaves the page with the session, so the sentence is repeated here.
    if (was === "upload" && view.state !== "unavailable" && !signingOut.current) setMessage({ type: "error", text: SESSION_ENDED });
    // …and the sentence must not outlive its cause (signed in again from another tab, then a refresh here).
    else if (view.state === "upload") setMessage((m) => (m?.text === SESSION_ENDED ? null : m));
    signingOut.current = false;
    heading.current?.focus();
  }, [view.state]);

  // Buttons are switched off with aria-disabled, not `disabled`: a disabled button drops the focus it holds.
  const off = busy || refreshing;

  function tryAgain() {
    if (off) return;
    retrying.current = true;
    setMessage({ type: "info", text: CHECKING });
    startRefresh(() => router.refresh());
  }

  async function run(starting: string, flow: () => Promise<Message>) {
    if (off) return;
    setBusy(true);
    setMessage({ type: "info", text: starting });
    try {
      setMessage(await flow());
    } catch (err) {
      console.error("admin panel", err);
      setMessage({ type: "error", text: "Something went wrong. Try again." });
    } finally {
      setBusy(false);
      // Every flow ends here, the failed ones too: whatever happened, the server's view is the one that counts.
      startRefresh(() => router.refresh());
    }
  }

  // On a host the relying party does not cover (a deploy preview, 127.0.0.1) every POST is refused by its Origin,
  // whatever was typed. The hint is the real reason then — not "wrong secret".
  const refused = (answer: { status: number; message: string }): Message => ({ type: "error", text: answer.status === 403 && view.hostHint ? `Passkeys do not work on this host. ${view.hostHint}` : answer.message });

  async function createPasskey(by: "secret" | "session"): Promise<Message> {
    const options = await post("register/options", by === "secret" ? { secret } : {});
    if (!options.ok) {
      if (options.status !== 403 || view.hostHint) return refused(options);
      // On the right host a 403 with a session means the session is gone — or older than the 5 minutes in which it
      // may add a passkey, and then the server's own sentence says what to do. With the secret it is the wrong
      // secret — or somebody enrolled in the meantime, and the server says that too.
      if (by === "session") return { type: "error", text: options.message === "Registration is closed." ? SESSION_ENDED : options.message };
      return { type: "error", text: options.message === "Registration is closed." ? options.message : "The secret was not accepted." };
    }
    let response;
    try {
      response = await startRegistration({ optionsJSON: options.data as PublicKeyCredentialCreationOptionsJSON });
    } catch (err) {
      return ceremonyProblem(err, true);
    }
    const verified = await post("register/verify", { response, label });
    if (!verified.ok) return refused(verified);
    setSecret(""); // asked for once; it has no business staying in the page
    setLabel("");
    return { type: "success", text: by === "secret" ? "Passkey created. You are signed in." : "Passkey added." };
  }

  async function signIn(): Promise<Message> {
    const options = await post("login/options", {});
    if (!options.ok) return refused(options);
    let response;
    try {
      response = await startAuthentication({ optionsJSON: options.data as PublicKeyCredentialRequestOptionsJSON });
    } catch (err) {
      return ceremonyProblem(err, false);
    }
    const verified = await post("login/verify", { response });
    return verified.ok ? { type: "success", text: "Signed in." } : refused(verified);
  }

  async function signOut(): Promise<Message> {
    signingOut.current = true;
    const done = await post("logout", {});
    if (done.ok) return { type: "success", text: "Signed out." };
    signingOut.current = false;
    return refused(done);
  }

  const PROMPT = "Follow your browser's passkey prompt.";
  const submit = (starting: string, flow: () => Promise<Message>) => (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void run(starting, flow); };

  const nameField = (id: string, text: string) => (
    <div>
      <label htmlFor={id} className={LABEL}>{text}</label>
      <input id={id} name={id} type="text" value={label} onChange={(e) => setLabel(e.target.value)} readOnly={off} maxLength={60} autoComplete="off"
        className={INPUT} placeholder="e.g. MacBook Touch ID" />
    </div>
  );

  return (
    <section aria-labelledby="passkey-panel-heading" className="max-w-md w-full bg-white dark:bg-gray-800 p-10 rounded-xl shadow-lg">
     <div className="space-y-6">
      {view.hostHint && (
        <p className={`p-3 rounded-md text-sm font-medium ${TONE.info}`}>{view.hostHint}</p>
      )}
      <h2 id="passkey-panel-heading" ref={heading} tabIndex={-1} className="text-center text-3xl font-extrabold text-gray-900 dark:text-white focus:outline-none">
        {HEADINGS[view.state]}
      </h2>

      {supported === false && (
        <p className={`p-3 rounded-md text-sm ${TONE.error}`}>This browser cannot use passkeys. Use a current Safari, Chrome, Edge or Firefox.</p>
      )}

      {view.state === "unavailable" && (
        <>
          <p className={TEXT}>The site could not check who is signed in, so nothing is offered here. Try again in a moment.</p>
          {/* Under `next dev` only (the expression is replaced when the bundle is built). The public pages read production
              over HTTP when MONGODB_URI is empty, so an empty one goes unnoticed until this page. */}
          {process.env.NODE_ENV === "development" && (
            <p className={TEXT}>Locally this usually means <code>MONGODB_URI</code> is empty in <code>.env</code>: the admin needs a database of its own. See README, “Admin sign-in”.</p>
          )}
          <button type="button" aria-disabled={off} onClick={tryAgain} className={secondary(off)}>Try again</button>
        </>
      )}

      {view.state === "enrol-disabled" && <p className={TEXT}>{enrolmentDisabledReason}</p>}

      {view.state === "enrol" && supported !== false && (
        <form className="space-y-6" onSubmit={submit(PROMPT, () => createPasskey("secret"))}>
          <p className={TEXT}>No passkey exists for this host yet. The enrolment secret is asked for once, here; after that it opens nothing.</p>
          <div>
            <label htmlFor="enrolmentSecret" className={LABEL}>Enrolment secret (UPLOAD_SECRET_KEY)</label>
            <input id="enrolmentSecret" name="enrolmentSecret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} required readOnly={off} autoComplete="off"
              className={INPUT} placeholder="Enter the enrolment secret" />
          </div>
          {nameField("passkeyLabel", "Name this passkey (optional)")}
          <button type="submit" aria-disabled={off} className={primary(off)}>Create passkey</button>
        </form>
      )}

      {view.state === "signin" && supported !== false && (
        <button type="button" aria-disabled={off} onClick={() => void run(PROMPT, signIn)} className={primary(off)}>Sign in with passkey</button>
      )}

      {view.state === "upload" && (
        <>
          <div>
            <h3 className={LABEL}>Passkeys for this host</h3>
            <ul className="mt-1 divide-y divide-gray-200 dark:divide-gray-700">
              {view.passkeys.map((p, i) => (
                // No ids reach the browser, so the position in the (oldest first) list is the key.
                <li key={i} className="py-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {p.label}
                    {p.synced && <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-normal bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">synced</span>}
                  </p>
                  {/* Two unbreakable halves: on a narrow card the line breaks at the dot, not inside a date. */}
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="whitespace-nowrap">Created <time dateTime={p.createdAt}>{stamp(p.createdAt)}</time></span>
                    {" · "}
                    <span className="whitespace-nowrap">{p.lastUsedAt ? <>last used <time dateTime={p.lastUsedAt}>{stamp(p.lastUsedAt)}</time></> : "not used yet"}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
          {supported !== false && (
            <form className="space-y-3" onSubmit={submit(PROMPT, () => createPasskey("session"))}>
              {nameField("newPasskeyLabel", "Name for a new passkey (optional)")}
              <p className="text-xs text-gray-600 dark:text-gray-400">Works within 5 minutes of signing in. Later than that: sign out, sign in again, then add it.</p>
              <button type="submit" aria-disabled={off} className={secondary(off)}>Add another passkey</button>
            </form>
          )}
          <button type="button" aria-disabled={off} onClick={() => void run("Signing out…", signOut)} className={secondary(off)}>Sign out</button>
        </>
      )}

     </div>
      {/* Always in the page: a live region that arrives together with its text is not read out. It sits outside
          the spaced block so that, empty, it adds nothing to the card. */}
      <div role="status" aria-live="polite">
        {message && <p className={`mt-6 p-3 rounded-md text-xs ${TONE[message.type]}`}>{message.text}</p>}
      </div>
    </section>
  );
}
