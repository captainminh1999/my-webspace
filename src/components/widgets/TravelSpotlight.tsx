"use client";

import { useEffect, useRef } from "react";

/**
 * The Travel dialog's one piece of client code: which trip is being read. Everything it lights is rendered on
 * the server; this only sets data-active-trip on the .sl root ("" for the overview) and .is-active on every
 * element whose data-lit lists that trip. It writes no text and announces nothing: the list is the content,
 * the map stays one role="img". Without it the dialog shows the overview, which reads fine.
 *
 * The trip being read is the last one whose top has passed the reading line: a third of the way down the
 * scroll area beside the map, or 24px under the map where the map is pinned above the list. Over the last
 * stretch of scroll the line slides down, so the oldest trips, which can never reach it, each still get a turn.
 * A trip heading focused from the keyboard lights its trip until the reader scrolls a third of a screen on.
 */
export function TravelSpotlight() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>(".sl");
    const sc = root?.closest<HTMLElement>("[data-scroller]");
    const fig = root?.querySelector<HTMLElement>(".sl-fig");
    if (!root || !sc || !fig) return;
    const trips = [...root.querySelectorAll<HTMLElement>("[data-trip]")];
    let tops: number[] = [];
    let pinH = 0;
    let cur = root.dataset.activeTrip ?? "";
    let raf = 0;
    let focusY: number | null = null;
    let focused = false;

    // Trip tops in scroll-content px, and the pinned map's height (0 where it is not pinned above the list).
    const measure = () => {
      const base = sc.getBoundingClientRect().top - sc.scrollTop;
      tops = trips.map((t) => t.getBoundingClientRect().top - base);
      pinH = getComputedStyle(root).getPropertyValue("--sl-stacked").trim() === "1" ? fig.offsetHeight : 0;
    };
    const set = (i: string) => {
      if (i === cur) return;
      root.querySelectorAll(".is-active").forEach((e) => e.classList.remove("is-active"));
      if (i) root.querySelectorAll(`[data-lit~="${i}"]`).forEach((e) => e.classList.add("is-active"));
      root.dataset.activeTrip = cur = i;
    };
    const pick = () => {
      raf = 0;
      const h = sc.clientHeight;
      const max = sc.scrollHeight - h;
      // A fractional scrollTop (zoom, a 125% display) may stop just short of the end.
      const y = sc.scrollTop >= max - 2 ? max : sc.scrollTop;

      const f = document.activeElement;
      const t = focused && f instanceof HTMLElement && root.contains(f) && f.matches(":focus-visible") ? f.closest<HTMLElement>("[data-trip]") : null;
      if (t) {
        focusY ??= y;
        const r = t.getBoundingClientRect();
        const s = sc.getBoundingClientRect();
        if (Math.abs(y - focusY) < h / 3 && r.bottom > s.top + pinH && r.top < s.bottom) return set(t.dataset.trip ?? "");
      }
      if (max < 1 || !tops.length) return set("");

      const L = pinH ? pinH + 24 : h / 3;
      // The oldest trip reaches the line 48px before the end: over the D px before that the line slides down by
      // S, as far as that trip falls short of it, at most half as fast as the list moves.
      const E = Math.min(48, max / 2);
      const S = Math.max(0, tops[tops.length - 1] - (max - E) - L);
      const D = Math.min(max - E, 2 * S);
      const line = L + (S > 0 && D > 0 ? S * Math.min(1, Math.max(0, (y - (max - E - D)) / D)) : 0);
      let i = "";
      for (let k = 0; k < tops.length && tops[k] <= y + line; k++) i = trips[k].dataset.trip ?? "";
      set(i);
    };
    const queue = () => {
      raf ||= requestAnimationFrame(pick);
    };
    const onFocusIn = () => {
      focused = true;
      focusY = null;
      queue();
    };
    const onFocusOut = () => {
      focused = false;
      queue();
    };
    const ro = new ResizeObserver(() => {
      measure();
      queue();
    });
    ro.observe(root);
    ro.observe(sc);
    sc.addEventListener("scroll", queue, { passive: true });
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    root.dataset.follow = "";
    return () => {
      ro.disconnect();
      sc.removeEventListener("scroll", queue);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      cancelAnimationFrame(raf);
      delete root.dataset.follow;
    };
  }, []);
  return <span hidden ref={ref} />;
}
