// singletons/{ _id: "verse" } — written whole by the verse feed, one document, no history.

export interface VerseSegment {
  /** Verse number within the chapter. */
  number: number;
  text: string;
}

export interface VerseData {
  /** The day this verse is for, YYYY-MM-DD in Australia/Sydney — the feed's own calendar, never the upstream's US date. */
  date: string;
  /** "Philippians 2:3-4", as the source gives it; the en dash is applied at render. */
  reference: string;
  /** "Philippians" and 2 — for the "Read Philippians 2" link. */
  book: string;
  chapter: number;
  /** The complete passage as plain text. Never truncated by the feed; the card decides how to set a long one. */
  text: string;
  /** Per-verse segments for the dialog's verse numbers; absent when the source gives one block of text. */
  verses?: VerseSegment[];
  /** "NIV" — the initials that must follow the quotation. */
  translation: string;
  /** "New International Version". */
  translationName: string;
  /** The notice the translation's publisher asks for, verbatim. Ours per translation: the upstream sends none. */
  notice: string;
  publicDomain: boolean;
  /** Built by the feed from the reference, https only — never an upstream string pasted into an href. */
  passageUrl: string;
  chapterUrl: string;
  /** Four questions, each at most 110 characters. The card shows the first three, the dialog all. */
  questions: string[];
  /** The method the questions follow, e.g. "Lectio Divina", and one line on where it comes from. */
  method: string;
  methodNote: string;
  /** Who chose the verse: "BibleGateway.com" (their wording "Powered by BibleGateway.com" must stay on the page) or "NET Bible". */
  source: string;
  sourceUrl: string;
}
