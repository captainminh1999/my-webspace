// Shared by the server-side readers (src/lib/dashboard.ts, src/lib/cv.ts): the entity
// decoding every payload gets, and where the deployed functions are when there is no
// MONGODB_URI (local development — see .env.example).

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/** YouTube titles arrive HTML-escaped ("I Couldn&#39;t…"); decode every string in a payload. */
export function decodeStrings<T>(input: T): T {
  if (typeof input === "string") {
    return input.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, code: string) => {
      if (ENTITIES[match]) return ENTITIES[match];
      if (code[0] === "#") {
        const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isNaN(n) || n > 0x10ffff ? match : String.fromCodePoint(n);
      }
      return match;
    }) as unknown as T;
  }
  if (Array.isArray(input)) return input.map((v) => decodeStrings(v)) as unknown as T;
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) out[k] = decodeStrings(v);
    return out as T;
  }
  return input;
}

export function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.URL ||
    "http://localhost:8888"
  ).replace(/\/$/, "");
}
