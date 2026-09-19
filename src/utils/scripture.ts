// Scripture as plain text from a source's HTML. Used by the verse feed only.
import { headline } from "./rss.ts";

/**
 * BibleGateway's verse of the day arrives as HTML. A publisher's section heading ("Ask, Seek,
 * Knock"), a psalm's title, verse numbers and footnote marks are not part of the quotation and
 * go out with their words; the divine name set in small caps keeps its printed form, LORD —
 * flattening it to "Lord" would change the translation's wording.
 */
export function scripture(html: string): string {
  return headline(
    html
      .replace(/<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/gi, " ")
      .replace(/<(sup|b)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<span[^>]*\bsmall-caps\b[^>]*>([^<]*)<\/span>/gi, (_, word: string) => word.toUpperCase())
      // An inline tag leaves nothing behind: a space here would stand before the comma in "LORD,".
      .replace(/<\/?(?:span|i|em)\b[^>]*>/gi, ""),
  ).replace(/\s+([,.;:!?])/g, "$1");
}
