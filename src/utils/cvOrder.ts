// Newest first, for every dated CV section. MongoDB returns the documents in the order
// an upload happened to insert them, which is the order of the CSV rows — no order at all.
import type { FullCvData } from "../types";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * A CV date as a month count: "Oct 2017", "October 2017", "2017", and the export's two-digit
 * years ("Mar 25" is March 2025). Infinity for "Present"; null when it cannot be read.
 */
export function monthOf(value: string | null | undefined): number | null {
  const text = (value ?? "").trim().toLowerCase();
  if (!text) return null;
  if (/^(present|current|now|ongoing)$/.test(text)) return Infinity;
  const m = text.match(/^(?:([a-z]{3})[a-z]*\.?\s+)?(\d{4}|\d{2})$/);
  if (!m) return null;
  const month = m[1] ? MONTHS.indexOf(m[1]) : 0;
  if (month < 0) return null;
  const year = m[2].length === 4 ? Number(m[2]) : Number(m[2]) + (Number(m[2]) < 50 ? 2000 : 1900);
  return year * 12 + month;
}

type Span = { start?: string | null; end?: string | null };

/**
 * [end, start] for comparing, newest first. With no end date an entry either still runs
 * (`open: "current"` — a role, volunteering) or is a moment (`open: "moment"` — a certificate
 * that does not expire, an award): then its start stands for both.
 */
function keys({ start, end }: Span, open: "current" | "moment"): [number, number] {
  const s = monthOf(start) ?? -Infinity;
  const e = monthOf(end) ?? (open === "current" && !(end ?? "").trim() ? Infinity : s);
  return [e, s];
}

// Infinity - Infinity is NaN; compare through this instead.
const compare = (a: number, b: number) => (a === b ? 0 : a > b ? -1 : 1);

function ordered<T>(items: readonly T[], span: (item: T) => Span, open: "current" | "moment"): T[] {
  return items
    .map((item, index) => ({ item, index, key: keys(span(item), open) }))
    .sort((a, b) => compare(a.key[0], b.key[0]) || compare(a.key[1], b.key[1]) || a.index - b.index)
    .map(({ item }) => item);
}

/** The section, newest first: what is current, then by when it ended, then by when it began. */
export function orderSection<S extends keyof FullCvData>(section: S, value: FullCvData[S]): FullCvData[S] {
  if (!Array.isArray(value)) return value;
  const list = value as unknown as Record<string, unknown>[];
  const text = (v: unknown) => (typeof v === "string" ? v : null);
  let out: Record<string, unknown>[] = list;
  if (section === "experience") {
    // Roles within a company first; the company then stands where its newest role does.
    const companies = list.map((c) => ({
      ...c,
      roles: ordered(Array.isArray(c.roles) ? (c.roles as Record<string, unknown>[]) : [], (r) => ({ start: text(r.startDate), end: text(r.endDate) }), "current"),
    }));
    out = ordered(companies, (c) => ({ start: text(c.roles[0]?.startDate), end: text(c.roles[0]?.endDate) }), "current");
  } else if (section === "education") out = ordered(list, (e) => ({ start: text(e.startDate), end: text(e.endDate) }), "current");
  else if (section === "volunteering") out = ordered(list, (v) => ({ start: text(v.startedOn), end: text(v.finishedOn) }), "current");
  else if (section === "projects") out = ordered(list, (p) => ({ start: text(p.startedOn), end: text(p.finishedOn) }), "moment");
  // A licence's second date is when it expires, which says nothing about how recent it is.
  else if (section === "licenses") out = ordered(list, (l) => ({ start: text(l.startedOn) }), "moment");
  else if (section === "honorsAwards") out = ordered(list, (h) => ({ start: text(h.issuedOn) }), "moment");
  return out as unknown as FullCvData[S];
}
