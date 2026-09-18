"use client";
import { useEffect } from "react";

// Keeps every freshness stamp and the masthead clock honest in a tab left
// open: once a minute it re-derives the text from the <time dateTime> the
// server rendered. Under 1 KB, no state, no re-render.
const LIMITS: Record<string, [number, number]> = { hourly: [2, 6], daily: [30, 72] };
const HM = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", hour: "2-digit", minute: "2-digit", hour12: false });
const DM = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", day: "numeric", month: "short" });

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
    const source = el.dataset.source;
    const r = rel(at, now);
    el.textContent =
      source === "content"
        ? `LATEST ${r}`
        : `${now.getTime() - at.getTime() < 86400e3 ? HM.format(at) : DM.format(at).toUpperCase()} · ${r}`;
    const [fresh, aging] = LIMITS[el.dataset.budget ?? "daily"];
    const hours = (now.getTime() - at.getTime()) / 3.6e6;
    const state = hours <= fresh ? "fresh" : hours <= aging ? "aging" : "stale";
    const holder = el.closest<HTMLElement>("[data-freshness]");
    if (holder && holder.dataset.freshness !== state) holder.dataset.freshness = state;
  });
  document.querySelectorAll<HTMLElement>("[data-live-clock]").forEach((el) => {
    el.textContent = HM.format(now);
  });
}

export default function FreshnessTicker() {
  useEffect(() => {
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  return null;
}
