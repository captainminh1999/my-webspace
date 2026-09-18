// Feed-age contract from docs/DESIGN-DIRECTION.md § Data freshness.
//
// A feed's age comes from singletons/meta.fetchedAt.<id> (written by the
// job that fetched it). Until every job has written that, the age falls
// back to the newest date inside the content and is labelled LATEST.
import type { DashboardData, WidgetId } from "@/types/dashboard";
import { relativeAge, toDate } from "./time";

export type Budget = "hourly" | "daily";
export type Source = "fetched" | "content" | "none";
export type State = "fresh" | "aging" | "stale" | "unknown";

export interface Freshness {
  id: WidgetId;
  at: Date | null;
  source: Source;
  budget: Budget;
  state: State;
  /** The relative age alone, for the masthead strip: "14 MIN", "3 H", "4 D", or "?" when unknown. */
  age: string;
  /** Stamp text, e.g. "14 MIN AGO", "JUST NOW", "LATEST 1 D", "AGE UNKNOWN". */
  text: string;
}

export const BUDGET: Record<WidgetId, Budget> = {
  weather: "hourly",
  tech: "daily",
  space: "daily",
  camera: "daily",
  coffee: "daily",
  drones: "daily",
  games: "daily",
  youtube: "daily",
};

// fresh / aging thresholds in hours
const LIMITS: Record<Budget, [number, number]> = { hourly: [2, 6], daily: [30, 72] };

function newest(dates: Array<string | number | undefined | null>): Date | null {
  let best: Date | null = null;
  for (const v of dates) {
    const d = toDate(v);
    if (d && (!best || d > best)) best = d;
  }
  return best;
}

/** Newest date the content itself carries, per feed. */
function contentDate(data: DashboardData, id: WidgetId): Date | null {
  switch (id) {
    case "weather":
      return toDate(data.weather?.updated);
    case "youtube":
      return newest((data.youtube?.items ?? []).map((i) => i.publishedAt));
    case "camera":
      return toDate(data.camera?.createdAt);
    case "space":
      return newest([data.space?.space?.date, data.space?.epic?.date?.replace(" ", "T") + "Z"]);
    case "coffee":
      return newest(data.coffee.map((a) => a.publishedAt));
    case "drones":
      return newest(data.drones.map((a) => a.publishedAt));
    case "games":
      return newest(data.games.map((g) => g.released));
    case "tech":
      return null; // Hacker News items carry no date
  }
}

export function stateFor(at: Date | null, budget: Budget, now: Date): State {
  if (!at) return "unknown";
  const hours = (now.getTime() - at.getTime()) / 3.6e6;
  const [fresh, aging] = LIMITS[budget];
  if (hours <= fresh) return "fresh";
  if (hours <= aging) return "aging";
  return "stale";
}

/** Same rule as the client ticker (FreshnessTicker.tsx) — keep the two in step. */
export function stampText(at: Date | null, source: Source, now: Date): string {
  if (!at || source === "none") return "AGE UNKNOWN";
  const rel = relativeAge(at, now);
  if (source === "content") return `LATEST ${rel}`;
  return rel === "NOW" ? "JUST NOW" : `${rel} AGO`;
}

export function freshnessFor(data: DashboardData, id: WidgetId, now: Date): Freshness {
  const budget = BUDGET[id];
  const fetched = toDate(data.meta?.fetchedAt?.[id]);
  let at = fetched;
  let source: Source = fetched ? "fetched" : "none";
  if (!at) {
    at = contentDate(data, id);
    source = at ? "content" : "none";
  }
  const state = source === "none" ? "unknown" : stateFor(at, budget, now);
  return { id, at, source, budget, state, age: at ? relativeAge(at, now) : "?", text: stampText(at, source, now) };
}

export function allFreshness(data: DashboardData, now: Date): Record<WidgetId, Freshness> {
  const out = {} as Record<WidgetId, Freshness>;
  for (const id of Object.keys(BUDGET) as WidgetId[]) out[id] = freshnessFor(data, id, now);
  return out;
}
