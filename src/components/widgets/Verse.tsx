import type { VerseData } from "@/types/verse";
import { monthDay, toDate } from "@/lib/time";
import { FALLBACK_QUESTIONS } from "@/utils/reflection";
import { enDash, wholeSentences } from "@/utils/verse";

// Scripture is never clamped. A long verse changes register (Fraunces is not set below 22px,
// so it moves to the body face) and only a passage beyond LIMIT is shortened — by whole
// sentences, with the rest one tap away in the dialog.
const LONG = 220;
const LIMIT = 480;

const questionsOf = (data: VerseData) => (data.questions?.length ? data.questions : FALLBACK_QUESTIONS);

function Questions({ id, heading, questions, size }: { id: string; heading: string; questions: readonly string[]; size: "text-item" | "text-body" }) {
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="stamp text-ink-3">
        {heading}
      </h3>
      {/* role="list": the list semantics a screen reader drops once list-style is none */}
      <ol role="list" className="mt-1 divide-y divide-rule">
        {questions.map((q, i) => (
          <li key={q} className={`${size === "text-body" ? "py-3" : "py-2"} grid grid-cols-[1.5rem_1fr] gap-3 items-start`}>
            <span aria-hidden className="font-mono text-dense text-ink-3 pt-0.5">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className={`${size} text-ink`}>{q}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The day's verse, and under it the first three of the day's questions. */
export function VerseCard({ data }: { data: VerseData | null }) {
  if (!data) return <p className="font-mono text-dense text-ink-3">No verse yet</p>;
  const shown = wholeSentences(data.text, LIMIT);
  return (
    <div className="flex flex-col grow">
      {/* The verse takes the spare height of an equal row, so the questions sit on the card's lower edge. */}
      <figure className="grow border-l-2 border-rule-strong pl-4">
        <blockquote cite={data.passageUrl}>
          <p className={`text-ink text-pretty ${shown.text.length > LONG ? "text-body" : "font-display font-medium text-headline"}`}>{shown.text}</p>
        </blockquote>
        {/* The citation, and the way to the whole chapter on the right; on a narrow card the link wraps under it. */}
        <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-mono text-source text-ink-3 uppercase">
          <span>
            <a href={data.passageUrl} target="_blank" rel="noopener noreferrer" className="text-ink-2 hover:text-accent transition-colors duration-120">
              <cite className="not-italic">{enDash(data.reference)}</cite>
            </a>{" "}
            ·{" "}
            <abbr title={data.translationName} className="no-underline">
              {data.translation}
            </abbr>
            {shown.continues && (
              <>
                {" "}
                ·{" "}
                <button type="button" data-open-dialog="verse" className="uppercase text-ink-2 hover:text-accent transition-colors duration-120 cursor-pointer">
                  Read in full ↗
                </button>
              </>
            )}
          </span>
          {data.chapter > 0 && (
            <a
              href={data.chapterUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Read full chapter: ${data.book} ${data.chapter}`}
              className="text-ink-2 hover:text-accent transition-colors duration-120"
            >
              Read full chapter <span aria-hidden>↗</span>
            </a>
          )}
        </figcaption>
      </figure>
      <div className="mt-4 pt-3 border-t border-rule">
        <Questions id="verse-card-reflect" heading="Reflect" questions={questionsOf(data).slice(0, 3)} size="text-item" />
      </div>
    </div>
  );
}

/** BibleGateway asks that its "Powered by" line stays on the page wherever its verse of the day is shown, so it never truncates; the chapter link yields instead. */
export function VerseFooter({ data }: { data: VerseData }) {
  return (
    <>
      <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 hover:text-accent">
        {data.source === "BibleGateway.com" ? "Powered by BibleGateway.com" : `Verse of the day: ${data.source}`}
      </a>
      {/* The chapter link sits under the verse; the footer's other end names the day's translation where there is room. */}
      <span className="hidden xl:inline truncate">
        {data.translationName}
        {data.publicDomain ? " · public domain" : ""}
      </span>
    </>
  );
}

export function VerseFull({ data }: { data: VerseData | null }) {
  if (!data) return <p className="font-mono text-dense text-ink-3">No verse yet</p>;
  const day = toDate(data.date);
  const numbered = data.verses && data.verses.length > 1 ? data.verses : null;
  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="stamp text-ink-3">Verse of the day{day ? ` · ${monthDay(day)}` : ""}</p>
        <figure className="mt-3 border-l-2 border-rule-strong pl-5">
          <blockquote cite={data.passageUrl}>
            <p className={`font-display font-medium text-ink text-pretty text-headline ${data.text.length > LONG ? "" : "md:text-h2"}`}>
              {numbered
                ? numbered.map((v) => (
                    <span key={v.number}>
                      <sup className="font-mono text-source text-ink-3 mr-1">{v.number}</sup>
                      {v.text}{" "}
                    </span>
                  ))
                : data.text}
            </p>
          </blockquote>
          <figcaption className="mt-4 font-mono text-source text-ink-3 uppercase">
            <cite className="not-italic text-ink-2">{enDash(data.reference)}</cite> · {data.translationName} ({data.translation})
          </figcaption>
        </figure>
        {data.chapter > 0 && (
          <p className="mt-5">
            <a href={data.chapterUrl} target="_blank" rel="noopener noreferrer" className="stamp text-ink-2 hover:text-accent transition-colors duration-120">
              Read full chapter · {data.book} {data.chapter} <span aria-hidden>↗</span>
            </a>
          </p>
        )}
      </section>

      <Questions id="verse-full-reflect" heading={`Questions to reflect on · ${data.method}`} questions={questionsOf(data)} size="text-body" />

      {/* Not .stamp: a publisher's notice stays verbatim, in its own capitals. */}
      <div className="flex flex-col gap-2 font-mono text-source text-ink-3">
        <p>{data.notice}</p>
        <p>
          Verse of the day:{" "}
          <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-ink-2 hover:text-accent underline underline-offset-3">
            {data.source === "BibleGateway.com" ? "Powered by BibleGateway.com" : data.source}
          </a>
          {" · "}A different translation each day.
        </p>
        <p>
          Questions: {data.methodNote} A fixed set in this site&rsquo;s own words, not written for this verse; the method changes daily.
        </p>
      </div>
    </div>
  );
}
