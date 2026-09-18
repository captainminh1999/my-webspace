/**
 * CV text fields hold bullet lists as one string, separated by "•" — or by
 * "â€¢", the same bullet after a UTF-8 → Windows-1252 round trip that some
 * uploads went through (see docs/ARCHITECTURE.md §6). Split them so pages can
 * render a real list; a string with no bullets comes back as one paragraph.
 */
export function splitBullets(text?: string | null): string[] {
  if (!text) return [];
  return text
    .split(/(?:\r?\n|â€¢|•)+/)
    .map((s) => s.replace(/^[\s\-–]+/, "").trim())
    .filter(Boolean);
}

export const isCurrent = (end?: string | number | null) =>
  !end || /present|current|now|ongoing/i.test(String(end));

/** "Oct 2017" + "Jul 2018" → "OCT 2017 — JUL 2018"; open-ended → "OCT 2017 — NOW". */
export function dateRange(start?: string | number | null, end?: string | number | null): string {
  const s = start ? String(start).toUpperCase() : "";
  const e = isCurrent(end) ? "NOW" : String(end).toUpperCase();
  return s ? `${s} — ${e}` : e === "NOW" ? "" : e;
}
