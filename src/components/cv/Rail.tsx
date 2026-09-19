"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SECTIONS, type SectionId } from "./sectionList";

// The reading line sits 30% down the viewport; the section that has crossed it most
// recently is the current one. Near the end of the page the line slides to the bottom
// edge, so short closing sections still get their turn.
const LINE = 0.3;

function sectionAtLine(): SectionId {
  const vh = window.innerHeight;
  const remaining = document.documentElement.scrollHeight - vh - window.scrollY;
  const line = vh - Math.min(Math.max(remaining, 0), vh * (1 - LINE));
  let found: SectionId = SECTIONS[0].id;
  for (const s of SECTIONS) {
    const el = document.getElementById(s.id);
    if (el && el.getBoundingClientRect().top <= line) found = s.id;
  }
  return found;
}

/**
 * Sticky left rail (lg) / sticky horizontal index (below lg) listing the sections.
 * On the overview (`current` unset) it follows the scroll: the entry for the section being
 * read lights up and the accent marker slides to it. On a section page it marks that page.
 */
export default function Rail({ current }: { current?: SectionId }) {
  const [spied, setSpied] = useState<SectionId | null>(null);
  const list = useRef<HTMLOListElement>(null);
  // A clicked entry stays current until the reader scrolls by hand: a jump to a short
  // section near the end cannot bring it up to the reading line.
  const locked = useRef<SectionId | null>(null);

  useEffect(() => {
    if (current) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      setSpied(locked.current ?? sectionAtLine());
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const unlock = () => {
      locked.current = null;
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("wheel", unlock, { passive: true });
    window.addEventListener("touchmove", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("wheel", unlock);
      window.removeEventListener("touchmove", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [current]);

  const activeId = current ?? spied;
  const index = SECTIONS.findIndex((s) => s.id === activeId);

  // Below lg the index is one scrolling line: keep the current entry in view.
  useEffect(() => {
    const ol = list.current;
    if (!ol || index < 0 || ol.scrollWidth <= ol.clientWidth) return;
    const li = ol.children[index] as HTMLElement;
    ol.scrollTo({ left: li.offsetLeft - 16, behavior: "smooth" });
  }, [index]);

  return (
    <nav aria-label="CV sections" className="relative lg:sticky lg:top-6 lg:self-start">
      {/* lg: rows are 1.5rem on a 2rem pitch, so the marker's place is the row number alone */}
      <span
        aria-hidden
        className={`hidden lg:block absolute left-0 top-1 h-4 w-0.5 bg-accent transition-[transform,opacity] duration-300 ease-out ${index < 0 ? "opacity-0" : ""}`}
        style={{ transform: `translateY(${Math.max(index, 0) * 2}rem)` }}
      />
      <ol ref={list} className="flex lg:flex-col gap-x-5 lg:gap-y-2 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0 [scrollbar-width:none]">
        {SECTIONS.map((s) => {
          const active = s.id === activeId;
          const className = `stamp block whitespace-nowrap py-1 lg:pl-3.5 transition-colors duration-300 ${active ? "text-ink" : "text-ink-3 hover:text-ink"}`;
          const label = (
            <>
              <span className={`transition-colors duration-300 ${active ? "text-accent" : "text-ink-3"}`}>{s.folio}</span> {s.title}
            </>
          );
          return (
            <li key={s.id} className="shrink-0">
              {current ? (
                <Link href={s.href ?? `/about-me#${s.id}`} aria-current={active ? "page" : undefined} className={className}>
                  {label}
                </Link>
              ) : (
                // A plain anchor: the browser scrolls (smoothly, see globals.css) and sets :target.
                <a
                  href={`#${s.id}`}
                  aria-current={active ? "location" : undefined}
                  className={className}
                  onClick={() => {
                    locked.current = s.id;
                    setSpied(s.id);
                  }}
                >
                  {label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
