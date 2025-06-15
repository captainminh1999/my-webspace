import { useEffect, useState } from "react";

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

/**
 * Fetch data for a single widget using the Netlify `get-widget` function.
 * Results are cached to avoid refetching the same widget repeatedly.
 */
export async function fetchWidgetData<T = unknown>(id: string): Promise<T> {
  const cached = widgetCache[id];
  if (cached instanceof Error) throw cached;
  if (cached !== undefined) return cached as T;
  if (!widgetPending[id]) {
    widgetPending[id] = fetch(`/.netlify/functions/get-widget?widget=${id}`)
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

export interface WidgetState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useWidgetData<T = unknown>(id: string): WidgetState<T> {
  const cached = widgetCache[id];
  const [state, setState] = useState<WidgetState<T>>(() => {
    if (cached instanceof Error) {
      return { data: null, loading: false, error: cached };
    }
    if (cached !== undefined) {
      return { data: cached as T, loading: false, error: null };
    }
    return { data: null, loading: true, error: null };
  });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fetchWidgetData<T>(id)
      .then((d) => {
        if (!cancelled) setState({ data: d, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to load widget data", err);
          setState({ data: null, loading: false, error: err });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return state;
}

/**
 * Helper to prefetch all widget data at once. This populates the single-widget
 * cache so subsequent `fetchWidgetData` calls resolve instantly. Useful for
 * server components that need all widget data.
 */
export async function fetchAllWidgetsData(): Promise<Record<string, unknown>> {
  const res = await fetch("/.netlify/functions/get-all-widgets");
  if (!res.ok) throw new Error("Failed to fetch widget data");
  const all = decodeStrings(await res.json()) as Record<string, unknown>;
  Object.assign(widgetCache, all);
  return all;
}
