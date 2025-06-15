
function decodeHtmlEntities(str: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
  };
  return str.replace(/&(#(?:x[0-9a-fA-F]+|\d+)|[a-zA-Z]+);/g, (match, code) => {
    if (entities[match]) return entities[match];
    if (code.startsWith("#x") || code.startsWith("#X")) {
      const num = parseInt(code.slice(2), 16);
      if (!isNaN(num)) return String.fromCharCode(num);
    } else if (code.startsWith("#")) {
      const num = parseInt(code.slice(1), 10);
      if (!isNaN(num)) return String.fromCharCode(num);
    }
    return match;
  });
}

function decodeStrings<T>(input: T): T {
  if (typeof input === "string") {
    return decodeHtmlEntities(input) as unknown as T;
  }
  if (Array.isArray(input)) {
    return input.map((v) => decodeStrings(v)) as unknown as T;
  }
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      out[k] = decodeStrings(v as unknown);
    }
    return out as T;
  }
  return input;
}

// Cache for data fetched via get-widget.ts
const widgetCache: Record<string, unknown> = {};
const widgetPending: Record<string, Promise<unknown>> = {};

export function getCachedWidget(id: string): unknown {
  return widgetCache[id];
}

/**
 * Fetch data for a single widget using the Netlify `get-widget` function.
 * Results are cached to avoid refetching the same widget repeatedly.
 */
export async function fetchWidgetData<T = unknown>(id: string): Promise<T> {
  const cached = widgetCache[id];
  if (cached instanceof Error) throw cached;
  if (cached !== undefined) return cached as T;
  if (!widgetPending[id]) {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
      process.env.URL ||
      'http://localhost:8888';
    const url = `${baseUrl}/.netlify/functions/get-widget?widget=${id}`;
    widgetPending[id] = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch widget data");
        return res.json();
      })
      .then((data) => {
        const decoded = decodeStrings(data);
        widgetCache[id] = decoded;
        delete widgetPending[id];
        return decoded as T;
      })
      .catch((err) => {
        widgetCache[id] = err as Error;
        delete widgetPending[id];
        throw err;
      });
  }
  return widgetPending[id] as Promise<T>;
}


/**
 * Helper to prefetch all widget data at once. This populates the single-widget
 * cache so subsequent `fetchWidgetData` calls resolve instantly. Useful for
 * server components that need all widget data.
 */
export async function fetchAllWidgetsData(): Promise<Record<string, unknown>> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    process.env.URL ||
    'http://localhost:8888';
  const url = `${baseUrl}/.netlify/functions/get-all-widgets`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch widget data");
  const all = decodeStrings(await res.json()) as Record<string, unknown>;
  Object.assign(widgetCache, all);
  return all;
}

/**
 * Hydrate the widget cache with data fetched on the server. This allows
 * client components to access the data without additional network requests.
 */
export function hydrateWidgetCache(data: Record<string, unknown>) {
  Object.assign(widgetCache, data);
}
