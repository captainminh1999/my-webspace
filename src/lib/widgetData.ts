import { useEffect, useState } from "react";

// Cache for data fetched via get-widget.ts
const widgetCache: Record<string, unknown> = {};
const widgetPending: Record<string, Promise<unknown>> = {};

/**
 * Fetch data for a single widget using the Netlify `get-widget` function.
 * Results are cached to avoid refetching the same widget repeatedly.
 */
export async function fetchWidgetData<T = unknown>(id: string): Promise<T> {
  if (widgetCache[id]) return widgetCache[id] as T;
  if (!widgetPending[id]) {
    widgetPending[id] = fetch(`/.netlify/functions/get-widget?widget=${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch widget data");
        return res.json();
      })
      .then((data) => {
        widgetCache[id] = data;
        delete widgetPending[id];
        return data;
      })
      .catch((err) => {
        delete widgetPending[id];
        throw err;
      });
  }
  return widgetPending[id] as Promise<T>;
}

export function useWidgetData<T = unknown>(id: string): T | null {
  const [data, setData] = useState<T | null>(
    (widgetCache[id] as T) ?? null,
  );

  useEffect(() => {
    fetchWidgetData<T>(id)
      .then((d) => setData(d))
      .catch((err) => {
        console.error("Failed to load widget data", err);
      });
  }, [id]);

  return data;
}

/**
 * Helper to prefetch all widget data at once. This populates the single-widget
 * cache so subsequent `fetchWidgetData` calls resolve instantly. Useful for
 * server components that need all widget data.
 */
export async function fetchAllWidgetsData(): Promise<Record<string, unknown>> {
  const res = await fetch("/.netlify/functions/get-all-widgets");
  if (!res.ok) throw new Error("Failed to fetch widget data");
  const all = (await res.json()) as Record<string, unknown>;
  Object.assign(widgetCache, all);
  return all;
}
