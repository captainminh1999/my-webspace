"use client";

import { useEffect, useRef } from "react";

/**
 * The Travel dialog's one piece of client code: which trip is being read. Everything it lights is rendered on
 * the server; this only sets data-active-trip on the .sl root ("" for the overview) and .is-active on every
 * element whose data-lit lists that trip. It writes no text and announces nothing: the list is the content,
 * the map stays one role="img". Without it the dialog shows the overview, which reads fine.
 *
 * The trip being read is the last one whose top has passed the reading line: a third of the way down the
 * scroll area beside the map (but above the first trip at the top, so the dialog opens on the overview however
 * tall the screen), or a third of the way down the list below the map where the map is pinned above it. Over
 * the last stretch of scroll the line slides down, so the oldest trips, which can never reach it, each still get
 * a turn. A trip heading focused from the keyboard lights its trip until the reader scrolls a third of a screen
 * on.
 *
 * It also keeps two lengths the CSS cannot know: the pinned map's height as the scroll area's scroll-padding
 * (so a heading reached by keyboard, and a page of PageDown, clear the map), and the pinned column's chrome
 * beside the map (caption, key, rail: the map gives up that much height, however the key wraps).
 */
export function TravelSpotlight() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>(".sl");
    const sc = root?.closest<HTMLElement>("[data-scroller]");
    const fig = root?.querySelector<HTMLElement>(".sl-fig");
    const pin = root?.querySelector<HTMLElement>(".sl-pin");
    const map = fig?.querySelector<HTMLElement>(".tmap");
    if (!root || !sc || !fig || !pin || !map) return;
    const trips = [...root.querySelectorAll<HTMLElement>("[data-trip]")];
    let tops: number[] = [];
    let pinH = 0;
    let cur = root.dataset.activeTrip ?? "";
    let raf = 0;
    let focusY: number | null = null;
    let focused = false;
    let stale = true;

    // Trip tops in scroll-content px, and the pinned map's height (0 where it is not pinned above the list). Not
    // while the dialog is closed: its boxes are all 0 then, and the last lengths should survive a reopen.
    const measure = () => {
      if (!sc.clientHeight) return;
      // Only promise that the map follows where it stays in view.
      root.toggleAttribute("data-follow", getComputedStyle(fig).position === "sticky" || getComputedStyle(pin).position === "sticky");
      const base = sc.getBoundingClientRect().top - sc.scrollTop;
      tops = trips.map((t) => t.getBoundingClientRect().top - base);
      pinH = getComputedStyle(root).getPropertyValue("--sl-stacked").trim() === "1" ? fig.offsetHeight : 0;
      sc.style.scrollPaddingTop = pinH ? `${pinH + 12}px` : "";
      if (getComputedStyle(pin).position === "sticky") {
        const chrome = `${Math.ceil(pin.offsetHeight - map.offsetHeight)}px`;
        if (root.style.getPropertyValue("--pin-chrome") !== chrome) root.style.setProperty("--pin-chrome", chrome);
      } else root.style.removeProperty("--pin-chrome");
    };
    const set = (i: string) => {
      if (i === cur) return;
      root.querySelectorAll(".is-active").forEach((e) => e.classList.remove("is-active"));
      if (i) root.querySelectorAll(`[data-lit~="${i}"]`).forEach((e) => e.classList.add("is-active"));
      root.dataset.activeTrip = cur = i;
    };
    const pick = () => {
      raf = 0;
      if (stale) {
        stale = false;
        measure();
      }
      const h = sc.clientHeight;
      const max = sc.scrollHeight - h;
      // A fractional scrollTop (zoom, a 125% display) may stop just short of the end.
      const y = max > 4 && sc.scrollTop >= max - 2 ? max : sc.scrollTop;

      const f = document.activeElement;
      const t = focused && f instanceof HTMLElement && root.contains(f) ? f.closest<HTMLElement>("[data-trip]") : null;
      if (t) {
        focusY ??= y;
        const r = t.getBoundingClientRect();
        const s = sc.getBoundingClientRect();
        if (Math.abs(y - focusY) < h / 3 && r.bottom > s.top + pinH && r.top < s.bottom) return set(t.dataset.trip ?? "");
      }
      if (max < 3 || !tops.length) return set("");

      // Stacked, the line is a third of the way down the list below the map, not just under it: a trip's year
      // heading sits above it, and the trip should light as it comes into view, not once that heading is gone.
      const L = Math.max(pinH ? pinH + 24 : 0, Math.min(pinH + (h - pinH) / 3, tops[0] - 40));
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
    // Only focus that arrives from the keyboard holds the map: a heading clicked with the mouse does not, even
    // once a key is pressed (when Chrome starts drawing its focus ring).
    const onFocusIn = (e: FocusEvent) => {
      focused = e.target instanceof Element && e.target.matches(":focus-visible");
      focusY = null;
      queue();
    };
    const onFocusOut = () => {
      focused = false;
      queue();
    };
    // Measured in the next frame, not in the observer's callback: measuring writes --pin-chrome, and a layout
    // change made inside the callback would be observed again in the same frame (a "ResizeObserver loop").
    const ro = new ResizeObserver(() => {
      stale = true;
      queue();
    });
    ro.observe(root);
    ro.observe(sc);
    ro.observe(pin);
    sc.addEventListener("scroll", queue, { passive: true });
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    return () => {
      ro.disconnect();
      sc.removeEventListener("scroll", queue);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      cancelAnimationFrame(raf);
      delete root.dataset.follow;
      sc.style.scrollPaddingTop = "";
      root.style.removeProperty("--pin-chrome");
    };
  }, []);
  return <span hidden ref={ref} />;
}
