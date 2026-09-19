// Pure helpers for the verse card: reading a Bible reference, Sydney's calendar,
// and the rotations that choose the day's translation and its questions.

/** USFM code, the usual English name, then other names a source may use. */
const BOOKS: [string, string, ...string[]][] = [
  ["GEN", "Genesis"], ["EXO", "Exodus"], ["LEV", "Leviticus"], ["NUM", "Numbers"], ["DEU", "Deuteronomy"],
  ["JOS", "Joshua"], ["JDG", "Judges"], ["RUT", "Ruth"], ["1SA", "1 Samuel"], ["2SA", "2 Samuel"],
  ["1KI", "1 Kings"], ["2KI", "2 Kings"], ["1CH", "1 Chronicles"], ["2CH", "2 Chronicles"], ["EZR", "Ezra"],
  ["NEH", "Nehemiah"], ["EST", "Esther"], ["JOB", "Job"], ["PSA", "Psalms", "Psalm"], ["PRO", "Proverbs"],
  ["ECC", "Ecclesiastes"], ["SNG", "Song of Solomon", "Song of Songs"], ["ISA", "Isaiah"], ["JER", "Jeremiah"],
  ["LAM", "Lamentations"], ["EZK", "Ezekiel"], ["DAN", "Daniel"], ["HOS", "Hosea"], ["JOL", "Joel"], ["AMO", "Amos"],
  ["OBA", "Obadiah"], ["JON", "Jonah"], ["MIC", "Micah"], ["NAM", "Nahum"], ["HAB", "Habakkuk"], ["ZEP", "Zephaniah"],
  ["HAG", "Haggai"], ["ZEC", "Zechariah"], ["MAL", "Malachi"], ["MAT", "Matthew"], ["MRK", "Mark"], ["LUK", "Luke"],
  ["JHN", "John"], ["ACT", "Acts"], ["ROM", "Romans"], ["1CO", "1 Corinthians"], ["2CO", "2 Corinthians"],
  ["GAL", "Galatians"], ["EPH", "Ephesians"], ["PHP", "Philippians"], ["COL", "Colossians"],
  ["1TH", "1 Thessalonians"], ["2TH", "2 Thessalonians"], ["1TI", "1 Timothy"], ["2TI", "2 Timothy"], ["TIT", "Titus"],
  ["PHM", "Philemon"], ["HEB", "Hebrews"], ["JAS", "James"], ["1PE", "1 Peter"], ["2PE", "2 Peter"],
  ["1JN", "1 John"], ["2JN", "2 John"], ["3JN", "3 John"], ["JUD", "Jude"], ["REV", "Revelation"],
];
const ONE_CHAPTER = new Set(["OBA", "PHM", "2JN", "3JN", "JUD"]);

export interface Reference {
  /** The book as the source wrote it ("Psalm"), for the page. */
  book: string;
  /** Its usual name ("Psalms"), for building links. */
  name: string;
  usfm: string;
  chapter: number;
  /** The verses meant, in order. */
  verses: number[];
}

/**
 * "Philippians 2:3-4", "John 3:16,18", "1 John 4:7–8", "Jude 24". Null for what the card does not take verse by verse:
 * a whole chapter, a passage across two chapters, or a book it does not know.
 */
export function parseReference(reference: string): Reference | null {
  const m = reference.trim().match(/^((?:[1-3] )?[A-Za-z][A-Za-z ]*?)\s+(\d+)(?::([\d,\s–-]+))?$/);
  if (!m) return null;
  const book = m[1].trim();
  const known = BOOKS.find(([, ...names]) => names.some((n) => n.toLowerCase() === book.toLowerCase()));
  if (!known) return null;
  const usfm = known[0];
  // "Jude 24" is verse 24 of the only chapter.
  const chapter = m[3] === undefined && ONE_CHAPTER.has(usfm) ? 1 : Number(m[2]);
  const spec = m[3] === undefined ? (ONE_CHAPTER.has(usfm) ? m[2] : "") : m[3];
  const verses: number[] = [];
  for (const part of spec.split(",").map((p) => p.trim()).filter(Boolean)) {
    const [from, to = from] = part.split(/[–-]/).map((n) => Number(n.trim()));
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to - from > 40) return null;
    for (let v = from; v <= to; v++) verses.push(v);
  }
  return verses.length ? { book, name: known[1], usfm, chapter, verses } : null;
}

/**
 * The text of one verse from bible.helloao.org, whose `content` mixes plain strings with
 * objects: poetry arrives as { text, poem } lines (most Psalms have no plain string at all),
 * footnote marks as { noteId }, line breaks as { lineBreak }.
 */
export function joinContent(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => (typeof part === "string" ? part : typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    // A footnote mark often sits between a sentence and its closing quote: born again.{note}” → born again.”
    .replace(/\s+([,.;:!?”’)\]])/g, "$1")
    .replace(/([“‘(\[])\s+/g, "$1")
    .replace(/\s*—\s*/g, "—")
    .trim();
}

/** Today's date in Sydney, YYYY-MM-DD — the card's calendar, whatever clock the upstream keeps. */
export function sydneyDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(now);
}

/** A calendar date as a day count, so rotations advance once per Sydney day. */
export function dayNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** The day's entry in a rotation. `drift` moves one step per full cycle, so two rotations of equal length do not stay paired. */
export function rotate<T>(list: readonly T[], day: number, drift = false): T {
  const step = drift ? day + Math.floor(day / list.length) : day;
  return list[((step % list.length) + list.length) % list.length];
}

/** "Philippians 2:3-4" → "Philippians 2:3–4". */
export const enDash = (reference: string) => reference.replace(/(\d)\s*-\s*(\d)/g, "$1–$2");

/**
 * Whole sentences up to `budget` characters, for the rare passage too long for the card.
 * Scripture is never cut mid-sentence: if the first sentence alone is over budget it is kept whole.
 */
export function wholeSentences(text: string, budget: number): { text: string; continues: boolean } {
  if (text.length <= budget) return { text, continues: false };
  const sentences = text.match(/[^.!?]+[.!?]+["'’”)]*\s*/g) ?? [text];
  let kept = "";
  for (const s of sentences) {
    if (kept && (kept + s).trimEnd().length > budget) break;
    kept += s;
  }
  kept = kept.trimEnd();
  return { text: kept, continues: kept.length < text.trimEnd().length };
}
