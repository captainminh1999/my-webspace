"use client";
import { useEffect } from "react";

// Keeps every freshness stamp and the masthead clock honest. The HTML comes
// from the ISR cache, so it can already be minutes old when it arrives: the
// first tick runs on mount, then one on every minute boundary, and one more
// whenever the tab comes back to the foreground. Under 1 KB, no state, no
// re-render. The text rules mirror stampText() in src/lib/freshness.ts.
const LIMITS: Record<string, [number, number]> = { hourly: [2, 6], daily: [30, 72] };
const HM = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", hour: "2-digit", minute: "2-digit", hour12: false });

function rel(from: Date, now: Date) {
  const s = Math.max(0, (now.getTime() - from.getTime()) / 1000);
  if (s < 60) return "NOW";
  if (s < 3600) return `${Math.floor(s / 60)} MIN`;
  if (s < 86400) return `${Math.floor(s / 3600)} H`;
  return `${Math.floor(s / 86400)} D`;
}

function tick() {
  const now = new Date();
  document.querySelectorAll<HTMLTimeElement>("time[data-budget]").forEach((el) => {
    const at = new Date(el.dateTime);
    if (Number.isNaN(at.getTime())) return;
    const r = rel(at, now);
    // The masthead strip shows the bare age; the stamps say "… AGO".
    const text = el.hasAttribute("data-short") ? r : el.dataset.source === "content" ? `LATEST ${r}` : r === "NOW" ? "JUST NOW" : `${r} AGO`;
    if (el.textContent !== text) el.textContent = text;
    const [fresh, aging] = LIMITS[el.dataset.budget ?? "daily"] ?? LIMITS.daily;
    const hours = (now.getTime() - at.getTime()) / 3.6e6;
    const state = hours <= fresh ? "fresh" : hours <= aging ? "aging" : "stale";
    const holder = el.closest<HTMLElement>("[data-freshness]");
    if (holder && holder.dataset.freshness !== state) holder.dataset.freshness = state;
  });
  const clock = HM.format(now);
  document.querySelectorAll<HTMLElement>("[data-live-clock]").forEach((el) => {
    if (el.textContent !== clock) el.textContent = clock;
  });
}

export default function FreshnessTicker() {
  useEffect(() => {
    tick();
    let interval: ReturnType<typeof setInterval> | undefined;
    const align = setTimeout(() => {
      tick();
      interval = setInterval(tick, 60_000);
    }, 60_000 - (Date.now() % 60_000) + 20);
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(align);
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
