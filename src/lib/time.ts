// Sydney-local formatting helpers. The server runs in UTC, so every
// human-readable time goes through Intl with an explicit time zone.
export const TZ = "Australia/Sydney";

// en-US for month names: en-AU/en-GB abbreviate September as "Sept", the design uses "SEP".
const fmt = (opts: Intl.DateTimeFormatOptions, locale = "en-AU") => new Intl.DateTimeFormat(locale, { timeZone: TZ, ...opts });

const F = {
  hm: fmt({ hour: "2-digit", minute: "2-digit", hour12: false }),
  dateline: fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  weekday: fmt({ weekday: "short" }),
  hourShort: fmt({ hour: "numeric", hour12: true }),
  hour24: fmt({ hour: "2-digit", hourCycle: "h23" }),
  mon: fmt({ month: "short" }, "en-US"),
  day: fmt({ day: "numeric" }),
  year: fmt({ year: "numeric" }),
  tzName: fmt({ timeZoneName: "short" }),
};

export const toDate = (v: string | number | Date | null | undefined): Date | null => {
  if (v == null || v === "") return null;
  const d = typeof v === "number" ? new Date(v < 1e12 ? v * 1000 : v) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "07:46" */
export const hm = (d: Date) => F.hm.format(d);
/** "14 Sep" → rendered uppercase by the stamp */
export const dayMon = (d: Date) => `${F.day.format(d)} ${F.mon.format(d)}`;
/** "Thursday 18 September 2026" */
export const dateline = (d: Date) => F.dateline.format(d);
/** "Thu" */
export const weekday = (d: Date) => F.weekday.format(d);
/** "22", "00" — two tabular characters, so twelve cells fit any card width */
export const hour24 = (d: Date) => F.hour24.format(d);
/** "7 am" → "7am" */
export const hourShort = (d: Date) => F.hourShort.format(d).replace(/\s/g, "").toLowerCase();
/** "AEST" / "AEDT" */
export const tzAbbrev = (d: Date) => {
  const part = F.tzName.formatToParts(d).find((p) => p.type === "timeZoneName");
  return part?.value ?? "AEST";
};
export const monthDay = dayMon;
/** "19 Sep 2026, 05:32 AEST" — the stamp's tooltip, so the absolute time is one hover away. */
export const longStamp = (d: Date) => `${dayMon(d)} ${F.year.format(d)}, ${hm(d)} ${tzAbbrev(d)}`;

/** Relative age in the stamp register: "14 MIN", "3 H", "4 D". */
export function relativeAge(from: Date, now: Date): string {
  const s = Math.max(0, (now.getTime() - from.getTime()) / 1000);
  if (s < 60) return "NOW";
  if (s < 3600) return `${Math.floor(s / 60)} MIN`;
  if (s < 86400) return `${Math.floor(s / 3600)} H`;
  return `${Math.floor(s / 86400)} D`;
}
